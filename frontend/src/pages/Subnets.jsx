import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Network, ChevronRight, Download, Columns, Radar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, auth } from '../api/client'
import { Modal, ConfirmDialog, Spinner, EmptyState, Can, ViewerNotice } from '../components/UI'
import { DiscoveryModal } from './Discovery'
import { createPortal } from 'react-dom'

const EMPTY_FORM = { name: '', network: '', cidr: '', gateway: '', vlan_id: '', interface_name: '', description: '', location: '' }

// All possible columns with labels
const ALL_COLS = {
  network:     { label: 'Network',     default: true,  render: (s) => (
    <span className="font-mono text-xs px-2 py-1 rounded-md text-emerald-400 border border-surface-border" style={{ backgroundColor: '#0f1117' }}>
      {s.network}/{s.cidr}
    </span>
  )},
  name:        { label: 'Name',        default: true,  render: (s) => <span className="text-slate-200 font-medium">{s.name}</span> },
  gateway:     { label: 'Gateway',     default: true,  render: (s) => <span className="text-slate-400 font-mono text-xs">{s.gateway || '—'}</span> },
  interface_name: { label: 'Interface', default: false, render: (s) => <span className="text-slate-400 font-mono text-xs">{s.interface_name || <span className="text-slate-600">—</span>}</span> },
  vlan_id:     { label: 'VLAN',        default: true,  render: (s) => s.vlan_id
    ? <span className="text-xs px-2 py-0.5 rounded text-slate-400 border border-surface-border whitespace-nowrap" style={{ backgroundColor: '#1a2133' }}>VLAN {s.vlan_id}</span>
    : <span className="text-slate-600">—</span>
  },
  ips:         { label: 'IPs',         default: true,  render: (s) => <><span className="text-slate-300">{s.used_count}</span><span className="text-slate-600"> / {s.ip_count}</span></> },
  location:    { label: 'Location',    default: true,  render: (s) => <span className="text-slate-400 text-xs">{s.location || '—'}</span> },
  description: { label: 'Description', default: false, render: (s) => <span className="text-slate-400 text-xs">{s.description || '—'}</span> },
}

function ColManager({ visible, onChange, onClose }) {
  const [local, setLocal] = useState(visible)
  const toggle = (key) => {
    if (key === 'network' || key === 'name') return // always visible
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
            const isLocked = key === 'network' || key === 'name'
            const isOn     = local.includes(key)
            return (
              <label key={key} className={`flex items-center gap-2.5 py-1.5 rounded-lg px-1.5 transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${isOn ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}
                  onClick={() => !isLocked && toggle(key)}>
                  {isOn && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                </div>
                <span className="text-sm text-slate-300">{col.label}</span>
                {isLocked && <span className="text-xs text-slate-600 ml-auto">always</span>}
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

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const METHODS = { auto: 'Auto (ARP if gateway, else TCP)', arp: 'ARP Sweep', tcp: 'TCP Probe' }

function ScheduleModal({ subnet, onClose, onSaved }) {
  const [form, setForm] = useState({
    frequency:   'none',
    run_time:    '02:00',
    day_of_week: 0,
    method:      'auto',
    is_active:   true,
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get(`/schedules/subnet/${subnet.id}`)
      .then(data => { if (data) setForm({ frequency: data.frequency, run_time: data.run_time,
        day_of_week: data.day_of_week, method: data.method, is_active: data.is_active }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [subnet.id])

  const toggle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/schedules', { ...form, subnet_id: subnet.id })
      toast.success(`Schedule saved for ${subnet.name}`)
      onSaved(); onClose()
    } catch (e) { toast.error(e.message || 'Failed to save schedule') }
    finally { setSaving(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                       backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998 }} />
      <div className="card animate-fade-in" style={{ position: 'relative', zIndex: 9999,
           width: '100%', maxWidth: '460px', padding: '1.5rem',
           boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>
              Schedule Discovery
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {subnet.name} — {subnet.network}/{subnet.cidr}
            </p>
          </div>
          <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none',
                                             cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading…</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Frequency */}
            <div>
              <label className="label">Frequency</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
                {['none','daily','weekly'].map(f => (
                  <button key={f} onClick={() => toggle('frequency', f)}
                          style={{ padding: '8px', borderRadius: '8px', cursor: 'pointer',
                                   textTransform: 'capitalize', fontSize: '13px', fontWeight: 500,
                                   border: `1px solid ${form.frequency === f ? 'rgba(23,181,132,0.5)' : '#1e2736'}`,
                                   backgroundColor: form.frequency === f ? 'rgba(23,181,132,0.1)' : '#0f1117',
                                   color: form.frequency === f ? '#17b584' : '#94a3b8' }}>
                    {f === 'none' ? 'Manual' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            {form.frequency !== 'none' && (
              <div style={{ display: 'grid', gridTemplateColumns: form.frequency === 'weekly' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                <div>
                  <label className="label">Run Time</label>
                  <input type="time" className="input" value={form.run_time}
                         onChange={e => toggle('run_time', e.target.value)} />
                </div>
                {form.frequency === 'weekly' && (
                  <div>
                    <label className="label">Day of Week</label>
                    <select className="input" value={form.day_of_week}
                            onChange={e => toggle('day_of_week', parseInt(e.target.value))}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Method */}
            {form.frequency !== 'none' && (
              <div>
                <label className="label">Discovery Method</label>
                <select className="input" value={form.method}
                        onChange={e => toggle('method', e.target.value)}
                        style={{ marginTop: '6px' }}>
                  {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Active toggle */}
            {form.frequency !== 'none' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div onClick={() => toggle('is_active', !form.is_active)}
                     style={{ width: '40px', height: '20px', borderRadius: '10px', position: 'relative',
                              backgroundColor: form.is_active ? '#17b584' : '#1e2736',
                              transition: 'background 0.2s', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: '2px', width: '16px', height: '16px',
                                borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
                                left: form.is_active ? '22px' : '2px' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Schedule Active</span>
              </label>
            )}

            {/* Summary */}
            {form.frequency !== 'none' && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#64748b',
                            backgroundColor: '#0f1117', border: '1px solid #1e2736' }}>
                {form.frequency === 'daily'
                  ? `Runs every day at ${form.run_time}`
                  : `Runs every ${DAYS[form.day_of_week]} at ${form.run_time}`}
                {' — '}{METHODS[form.method]}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export function Subnets() {
  const defaultVisible = Object.entries(ALL_COLS).filter(([, c]) => c.default).map(([k]) => k)
  const [visible, setVisible]       = useState(defaultVisible)
  const [showColMgr, setColMgr]     = useState(false)
  const [subnets, setSubnets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [selected, setSelected]     = useState(new Set())   // selected subnet ids
  const [showDiscovery, setDiscovery] = useState(false)
  const [scheduling, setScheduling]   = useState(null)  // subnet being scheduled
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const load = () => api.getSubnets().then(data => { setSubnets(data); setPage(1) }).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const doExport = async () => {
    const exportCols = visible.filter(c => c !== 'ips')
    const url = `/api/import/subnets/export?columns=${exportCols.join(',')}`
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${auth.getToken()}` } })
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `subnets_export_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) { toast.error('Export failed') }
  }

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true) }
  const openEdit   = (s) => {
    setForm({ name: s.name, network: s.network, cidr: s.cidr,
              gateway: s.gateway || '', vlan_id: s.vlan_id || '',
              interface_name: s.interface_name || '',
              description: s.description || '', location: s.location || '' })
    setEditing(s); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.network || !form.cidr) { toast.error('Name, network and CIDR are required'); return }
    setSaving(true)
    try {
      const payload = { ...form, cidr: Number(form.cidr),
                        vlan_id: form.vlan_id ? Number(form.vlan_id) : null,
                        gateway: form.gateway || null,
                        interface_name: form.interface_name || null,
                        description: form.description || null,
                        location: form.location || null }
      if (editing) {
        await api.updateSubnet(editing.id, { name: payload.name, gateway: payload.gateway,
          vlan_id: payload.vlan_id, interface_name: payload.interface_name,
          description: payload.description, location: payload.location })
        toast.success('Subnet updated')
      } else {
        await api.createSubnet(payload)
        toast.success('Subnet created')
      }
      setShowForm(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await api.deleteSubnet(deleting.id); toast.success('Subnet deleted'); setDeleting(null); load() }
    catch (e) { toast.error(e.message) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  if (loading) return <Spinner />

  return (
    <div className="animate-fade-in">
      <ViewerNotice />
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Subnets</h1>
          <p className="text-sm text-slate-500 mt-1">{subnets.length} network{subnets.length !== 1 ? 's' : ''} configured</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              if (selected.size === 0) { toast.error('Select at least one subnet to discover'); return }
              setDiscovery(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
              fontWeight: 500, cursor: 'pointer', border: '1px solid',
              borderColor: selected.size > 0 ? 'rgba(23,181,132,0.5)' : '#1e2736',
              backgroundColor: selected.size > 0 ? 'rgba(23,181,132,0.1)' : 'transparent',
              color: selected.size > 0 ? '#17b584' : '#475569',
              transition: 'all 0.2s'
            }}>
            <Radar size={14} />
            {selected.size > 0 ? `Discover ${selected.size} Subnet${selected.size > 1 ? 's' : ''}` : 'Discover'}
          </button>
          <div className="relative">
            <button onClick={() => setColMgr(v => !v)} className="btn-secondary gap-1.5">
              <Columns size={14} /> Columns
            </button>
            {showColMgr && <ColManager visible={visible} onChange={setVisible} onClose={() => setColMgr(false)} />}
          </div>
          <button onClick={doExport} className="btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <Can role="editor"><button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add Subnet</button></Can>
        </div>
      </div>

      {subnets.length === 0 ? (
        <EmptyState icon={Network} title="No subnets yet"
          description="Add your first network block to get started"
          action={<button onClick={openCreate} className="btn-primary">Add Subnet</button>} />
      ) : (() => {
        const totalPages  = Math.ceil(subnets.length / PAGE_SIZE)
        const paginated   = subnets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        return (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox"
                    className="w-4 h-4 rounded cursor-pointer"
                    checked={selected.size === subnets.length && subnets.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(subnets.map(s => s.id)) : new Set())}
                    style={{ accentColor: '#17b584' }} />
                </th>
                {visible.map(key => (
                  <th key={key} className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-medium">
                    {ALL_COLS[key].label}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr key={s.id}
                    className={`border-b border-surface-border last:border-0 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-surface-DEFAULT/30'}`}
                    style={{ backgroundColor: selected.has(s.id) ? 'rgba(23,181,132,0.05)' : '' }}
                    onClick={() => navigate(`/ips?subnet_id=${s.id}&subnet_name=${encodeURIComponent(s.name)}`)}
                    onMouseEnter={e => { if (!selected.has(s.id)) e.currentTarget.style.backgroundColor = '#1a2133'; const a = e.currentTarget.querySelector('.row-actions'); if(a) a.style.opacity='1' }}
                    onMouseLeave={e => { if (!selected.has(s.id)) e.currentTarget.style.backgroundColor = ''; const a = e.currentTarget.querySelector('.row-actions'); if(a) a.style.opacity='0' }}>
                  <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      className="w-4 h-4 rounded cursor-pointer"
                      checked={selected.has(s.id)}
                      onChange={e => {
                        const next = new Set(selected)
                        e.target.checked ? next.add(s.id) : next.delete(s.id)
                        setSelected(next)
                      }}
                      style={{ accentColor: '#17b584' }} />
                  </td>
                  {visible.map(key => (
                    <td key={key} className="px-5 py-3.5">{ALL_COLS[key].render(s)}</td>
                  ))}
                  <td className="px-5 py-3.5">
                    <Can role="editor">
                      <div className="row-actions flex items-center gap-1 justify-end transition-opacity" style={{ opacity: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setScheduling(s) }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                                title="Schedule discovery"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='rgba(245,158,11,0.1)' }}
                                onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='transparent' }}>
                          <Clock size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEdit(s) }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='#1e2736' }}
                                onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='transparent' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleting(s) }}
                                className="p-1.5 rounded-lg text-slate-400 transition-colors"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171' }}
                                onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.color='' }}>
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={13} className="text-slate-600 ml-1" />
                      </div>
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t"
                 style={{ borderColor: '#1e2736' }}>
              <span className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, subnets.length)} of {subnets.length}
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
          )}
        </div>
        )
      })()}

      {showForm && (
        <Modal title={editing ? 'Edit Subnet' : 'Add Subnet'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={f('name')} placeholder="e.g. Management Network" />
              </div>
              <div>
                <label className="label">Network Address *</label>
                <input className="input font-mono" value={form.network} onChange={f('network')} placeholder="192.168.1.0" disabled={!!editing} />
              </div>
              <div>
                <label className="label">CIDR *</label>
                <input className="input font-mono" type="number" min="0" max="32" value={form.cidr} onChange={f('cidr')} placeholder="24" disabled={!!editing} />
              </div>
              <div>
                <label className="label">Gateway</label>
                <input className="input font-mono" value={form.gateway} onChange={f('gateway')} placeholder="192.168.1.1" />
              </div>
              <div>
                <label className="label">VLAN ID</label>
                <input className="input" type="number" min="1" max="4094" value={form.vlan_id} onChange={f('vlan_id')} placeholder="e.g. 10" />
              </div>
              <div>
                <label className="label">Interface Name</label>
                <input className="input font-mono" value={form.interface_name} onChange={f('interface_name')} placeholder="e.g. Vlan10, GigabitEthernet0/0" />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={form.location} onChange={f('location')} placeholder="e.g. DC-1, Office" />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={f('description')} placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Subnet'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete subnet "${deleting.name}" (${deleting.network}/${deleting.cidr})? All IPs will also be removed.`}
          onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}

      {showDiscovery && (
        <DiscoveryModal
          subnetIds={[...selected]}
          subnetNames={subnets.filter(s => selected.has(s.id)).map(s => `${s.name} (${s.network}/${s.cidr})`)}
          onClose={() => { setDiscovery(false); setSelected(new Set()) }}
        />
      )}

      {scheduling && (
        <ScheduleModal
          subnet={scheduling}
          onClose={() => setScheduling(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}
