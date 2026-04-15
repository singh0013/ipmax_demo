import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Trash2, Pencil, Globe, X, Download, Columns } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, auth } from '../api/client'
import { StatusBadge, Modal, ConfirmDialog, Spinner, EmptyState, Can, ViewerNotice } from '../components/UI'

const STATUSES   = ['used', 'free', 'reserved', 'deprecated', 'used-dhcp']
const EMPTY_FORM = { ip_address: '', hostname: '', status: 'free', assigned_to: '', mac_address: '', description: '', tags: '' }

const ALL_COLS = {
  ip_address:  { label: 'IP Address',  default: true,  locked: true,  render: (ip) => (
    <span className="font-mono text-xs px-2 py-1 rounded-md text-blue-400 border border-surface-border" style={{ backgroundColor: '#0f1117' }}>{ip.ip_address}</span>
  )},
  hostname:    { label: 'Hostname',    default: true,  locked: false, render: (ip) => <span className="text-slate-300 font-medium">{ip.hostname || <span className="text-slate-600">—</span>}</span> },
  status:      { label: 'Status',      default: true,  locked: false, render: (ip) => <StatusBadge status={ip.status} /> },
  subnet:      { label: 'Subnet',      default: true,  locked: false, render: (ip, sm) => {
    const s = sm[ip.subnet_id]
    return s
      ? <span className="font-mono text-xs px-2 py-0.5 rounded text-emerald-400 border border-surface-border" style={{ backgroundColor: '#0f1117' }}>{s.network}/{s.cidr}</span>
      : <span className="text-slate-600">—</span>
  }},
  location:    { label: 'Location',    default: true,  locked: false, render: (ip, sm) => <span className="text-slate-400 text-xs">{sm[ip.subnet_id]?.location || <span className="text-slate-600">—</span>}</span> },
  assigned_to: { label: 'Assigned To', default: true,  locked: false, render: (ip) => <span className="text-slate-400 text-xs">{ip.assigned_to || <span className="text-slate-600">—</span>}</span> },
  mac_address: { label: 'MAC',         default: false, locked: false, render: (ip) => <span className="font-mono text-xs text-slate-500">{ip.mac_address || <span className="text-slate-600">—</span>}</span> },
  tags:        { label: 'Tags',        default: true,  locked: false, render: (ip) => (
    <div className="flex gap-1 flex-wrap">
      {(ip.tags || []).map(tag => (
        <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(23,181,132,0.1)', color: '#3dcfa0', border: '1px solid rgba(23,181,132,0.2)' }}>{tag}</span>
      ))}
    </div>
  )},
  description: { label: 'Description', default: false, locked: false, render: (ip) => <span className="text-slate-400 text-xs">{ip.description || <span className="text-slate-600">—</span>}</span> },
}

function ColManager({ visible, onChange, onClose }) {
  const [local, setLocal] = useState(visible)
  const toggle = (key) => {
    if (ALL_COLS[key]?.locked) return
    setLocal(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-40 rounded-xl border p-3 w-52 shadow-xl"
           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Manage columns</p>
        <div className="space-y-1">
          {Object.entries(ALL_COLS).map(([key, col]) => {
            const isOn = local.includes(key)
            return (
              <label key={key} className={`flex items-center gap-2.5 py-1.5 rounded-lg px-1.5 transition-colors ${col.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${isOn ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}
                  onClick={() => toggle(key)}>
                  {isOn && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                </div>
                <span className="text-sm text-slate-300">{col.label}</span>
                {col.locked && <span className="text-xs text-slate-600 ml-auto">always</span>}
              </label>
            )
          })}
        </div>
        <div className="border-t mt-3 pt-3 flex gap-2" style={{ borderColor: '#1e2736' }}>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-xs py-1.5">Cancel</button>
          <button onClick={() => { onChange(local); onClose() }} className="btn-primary flex-1 justify-center text-xs py-1.5">Apply</button>
        </div>
      </div>
    </>
  )
}

function IPRow({ ip, i, subnetMap, visible, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      className={`border-b border-surface-border last:border-0 transition-colors ${i % 2 === 0 ? '' : ''}`}
      style={{ backgroundColor: hovered ? '#1a2133' : '' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {visible.map(key => (
        <td key={key} className="px-4 py-3">{ALL_COLS[key].render(ip, subnetMap)}</td>
      ))}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end"
             style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button onClick={() => onEdit(ip)}
                  className="p-1.5 rounded-lg text-slate-400 transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e2736'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(ip)}
                  className="p-1.5 rounded-lg text-slate-400 transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function IPAddresses() {
  const [searchParams]            = useSearchParams()
  const subnetId                  = searchParams.get('subnet_id')
  const subnetName                = searchParams.get('subnet_name')

  const defaultVisible = Object.entries(ALL_COLS).filter(([, c]) => c.default).map(([k]) => k)
  const [visible, setVisible]     = useState(defaultVisible)
  const [showColMgr, setColMgr]   = useState(false)

  const [ips, setIps]             = useState([])
  const [subnets, setSubnets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM, subnet_id: subnetId || '' })
  const [saving, setSaving]       = useState(false)
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 50

  const subnetMap = Object.fromEntries(subnets.map(s => [s.id, s]))

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.getIPs({ subnet_id: subnetId || undefined, status: statusFilter || undefined, search: search || undefined }),
      subnets.length === 0 ? api.getSubnets() : Promise.resolve(null)
    ]).then(([ipData, subnetData]) => {
      setIps(ipData)
      setPage(1)
      if (subnetData) setSubnets(subnetData)
    }).finally(() => setLoading(false))
  }, [subnetId, statusFilter, search, subnets.length])

  useEffect(() => { load() }, [subnetId, statusFilter])
  
  const prevSearch = useRef(search)
  useEffect(() => {
    if (prevSearch.current === search) return
    prevSearch.current = search
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
  }, [search])

  const doExport = async () => {
    const COL_MAP = { subnet: 'subnet', location: 'location' }
    const cols = visible.map(k => COL_MAP[k] || k)
    const params = new URLSearchParams()
    if (subnetId) params.set('subnet_id', subnetId)
    params.set('columns', cols.join(','))
    const url = `/api/import/ips/export?${params}`
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${auth.getToken()}` } })
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `ips_export_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) { toast.error('Export failed') }
  }

  const openCreate = () => { setForm({ ...EMPTY_FORM, subnet_id: subnetId || '' }); setEditing(null); setShowForm(true) }
  const openEdit   = (ip) => {
    setForm({ ip_address: ip.ip_address, hostname: ip.hostname || '', status: ip.status,
              assigned_to: ip.assigned_to || '', mac_address: ip.mac_address || '',
              description: ip.description || '', tags: (ip.tags || []).join(', '),
              subnet_id: ip.subnet_id })
    setEditing(ip); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.ip_address || !form.subnet_id) { toast.error('IP address and subnet are required'); return }
    setSaving(true)
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null
      if (editing) {
        await api.updateIP(editing.id, { hostname: form.hostname || null, status: form.status,
          assigned_to: form.assigned_to || null, mac_address: form.mac_address || null,
          description: form.description || null, tags })
        toast.success('IP updated')
      } else {
        await api.createIP({ ip_address: form.ip_address, hostname: form.hostname || null,
          status: form.status, assigned_to: form.assigned_to || null,
          mac_address: form.mac_address || null, description: form.description || null,
          tags, subnet_id: form.subnet_id })
        toast.success('IP added')
      }
      setShowForm(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await api.deleteIP(deleting.id); toast.success('IP deleted'); setDeleting(null); load() }
    catch (e) { toast.error(e.message) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="animate-fade-in">
      <ViewerNotice />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            IP Addresses
            {subnetName && <span className="text-slate-500 font-normal text-lg"> / {decodeURIComponent(subnetName)}</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{ips.length} entr{ips.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button onClick={() => setColMgr(v => !v)} className="btn-secondary gap-1.5">
              <Columns size={14} /> Columns
            </button>
            {showColMgr && <ColManager visible={visible} onChange={setVisible} onClose={() => setColMgr(false)} />}
          </div>
          <button onClick={doExport} className="btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={15} /> Add IP
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9 pr-8" placeholder="Search IP, hostname, owner…"
                 value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X size={12} /></button>}
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : ips.length === 0 ? (
        <EmptyState icon={Globe} title="No IP addresses found"
          description={search || statusFilter ? "Try adjusting your filters" : "Add the first IP to this subnet"}
          action={!search && !statusFilter && <button onClick={openCreate} className="btn-primary">Add IP</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {visible.map(key => (
                  <th key={key} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wide font-medium">
                    {ALL_COLS[key].label}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {ips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ip, i) => (
                <IPRow key={ip.id} ip={ip} i={i} subnetMap={subnetMap} visible={visible}
                       onEdit={openEdit} onDelete={setDeleting} />
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {ips.length > PAGE_SIZE && (() => {
            const totalPages = Math.ceil(ips.length / PAGE_SIZE)
            return (
              <div className="flex items-center justify-between px-5 py-3 border-t"
                   style={{ borderColor: '#1e2736' }}>
                <span className="text-xs text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, ips.length)} of {ips.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          className="px-2 py-1 rounded text-xs text-slate-400 disabled:opacity-30 hover:bg-white/5">
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={i} className="px-2 text-slate-600 text-xs">…</span>
                      : <button key={p} onClick={() => setPage(p)}
                                className="w-7 h-7 rounded text-xs transition-colors"
                                style={{ backgroundColor: p === page ? '#a78bfa' : 'transparent',
                                         color: p === page ? 'white' : '#94a3b8' }}>{p}</button>
                    )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          className="px-2 py-1 rounded text-xs text-slate-400 disabled:opacity-30 hover:bg-white/5">
                    Next →
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit IP Address' : 'Add IP Address'} onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">IP Address *</label>
                <input className="input font-mono" value={form.ip_address} onChange={f('ip_address')} placeholder="192.168.1.10" disabled={!!editing} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              {!editing && (
                <div className="col-span-2">
                  <label className="label">Subnet *</label>
                  <select className="input" value={form.subnet_id} onChange={f('subnet_id')}>
                    <option value="">Select subnet…</option>
                    {subnets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.network}/{s.cidr})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Hostname</label>
                <input className="input" value={form.hostname} onChange={f('hostname')} placeholder="server-01" />
              </div>
              <div>
                <label className="label">Assigned To</label>
                <input className="input" value={form.assigned_to} onChange={f('assigned_to')} placeholder="Team or person" />
              </div>
              <div>
                <label className="label">MAC Address</label>
                <input className="input font-mono" value={form.mac_address} onChange={f('mac_address')} placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input className="input" value={form.tags} onChange={f('tags')} placeholder="prod, web, critical" />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={f('description')} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add IP'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete IP ${deleting.ip_address}${deleting.hostname ? ` (${deleting.hostname})` : ''}?`}
          onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  )
}
