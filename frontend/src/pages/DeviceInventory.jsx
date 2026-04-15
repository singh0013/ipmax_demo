import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Plug, Radio, ChevronDown, ChevronUp, RefreshCw, Upload, Download, Lock } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { PurchaseBanner } from '../components/PurchaseBanner'
import { api } from '../api/client'

// ── Badges ──────────────────────────────────────────────────────
const VENDOR_COLOR = {
  arista:  { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  cisco:   { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  hp:      { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  juniper: { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
}
const ROLE_COLOR = {
  gateway:  { bg: 'rgba(23,181,132,0.15)', text: '#17b584' },
  switch:   { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' },
  router:   { bg: 'rgba(167,139,250,0.15)',text: '#a78bfa' },
  firewall: { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
}
function Badge({ label, colors }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium capitalize"
          style={{ backgroundColor: colors?.bg, color: colors?.text }}>
      {label}
    </span>
  )
}

// ── Sample CSV ──────────────────────────────────────────────────
const SAMPLE_CSV = `ip_address,name,vendor,ssh_port,role
172.22.110.252,Core-Switch-01,arista,22,gateway
172.22.110.253,Core-Switch-02,cisco,22,switch
10.184.22.1,Firewall-01,cisco,22,firewall
192.168.1.254,Access-SW-01,hp,22,switch
`
function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'device_inventory_sample.csv'; a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines   = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim())
    const row  = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(r => r.ip_address && r.vendor)
}

// ── Gateway Modal ───────────────────────────────────────────────
function GatewayModal({ gateway, subnets, onClose, onSaved }) {
  const isEdit  = !!gateway
  const fileRef = useRef()

  const [form, setForm] = useState({
    ip_address: gateway?.ip_address || '',
    vendor:     gateway?.vendor     || 'arista',
    name:       gateway?.name       || '',
    username:   gateway?.username   || '',
    password:   '',
    ssh_port:   gateway?.ssh_port   || 22,
    role:       gateway?.role       || 'gateway',
    is_active:  gateway?.is_active  ?? true,
    subnet_ids: gateway?.subnet_ids || [],
  })

  const [saving,    setSaving]    = useState(false)
  const [csvRows,   setCsvRows]   = useState([])
  const [csvPass,   setCsvPass]   = useState('')
  const [csvUser,   setCsvUser]   = useState('')
  const [importing, setImporting] = useState(false)
  const [fileName,  setFileName]  = useState('')

  const toggle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      if (rows.length === 0) { toast.error('No valid rows — check CSV format (ip_address + vendor required)'); return }
      setCsvRows(rows)
      toast.success(`${rows.length} devices found`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!form.ip_address) { toast.error('IP Address is required'); return }
    if (!form.vendor)     { toast.error('Vendor is required');     return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      if (isEdit) {
        await api.put(`/gateways/${gateway.id}`, payload)
        toast.success('Device updated')
      } else {
        await api.post('/gateways', payload)
        toast.success('Device added')
      }
      onSaved(); onClose()
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleImport = async () => {
    if (csvRows.length === 0) { toast.error('No rows to import'); return }
    setImporting(true)
    let success = 0, failed = 0
    for (const row of csvRows) {
      try {
        await api.post('/gateways', {
          ip_address: row.ip_address,
          vendor:     row.vendor,
          name:       row.name     || row.ip_address,
          username:   row.username || csvUser || '',
          password:   csvPass      || '',
          ssh_port:   parseInt(row.ssh_port) || 22,
          role:       row.role     || 'gateway',
          is_active:  true,
          subnet_ids: [],
        })
        success++
      } catch { failed++ }
    }
    setImporting(false)
    toast.success(`Imported: ${success} devices${failed ? `, ${failed} failed` : ''}`)
    onSaved(); onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-xl border shadow-2xl"
           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
             style={{ borderColor: '#1e2736' }}>
          <h2 className="text-white font-semibold text-sm">
            {isEdit ? 'Edit Device' : 'Add Device'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* IP + Vendor (mandatory) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                IP Address <span className="text-red-400">*</span>
              </label>
              <input value={form.ip_address} onChange={e => toggle('ip_address', e.target.value)}
                     placeholder="172.22.110.252"
                     className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                     style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Vendor <span className="text-red-400">*</span>
              </label>
              <select value={form.vendor} onChange={e => toggle('vendor', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                      style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }}>
                <option value="arista">Arista</option>
                <option value="cisco">Cisco</option>
                <option value="hp">HP / Aruba</option>
                <option value="juniper">Juniper</option>
              </select>
            </div>
          </div>

          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Name <span className="text-slate-600 text-xs">(optional)</span>
              </label>
              <input value={form.name} onChange={e => toggle('name', e.target.value)}
                     placeholder="Core-Switch-01"
                     className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                     style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Role</label>
              <select value={form.role} onChange={e => toggle('role', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                      style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }}>
                <option value="gateway">Gateway</option>
                <option value="switch">Switch</option>
                <option value="router">Router</option>
                <option value="firewall">Firewall</option>
              </select>
            </div>
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Username <span className="text-slate-600 text-xs">(optional)</span>
              </label>
              <input value={form.username} onChange={e => toggle('username', e.target.value)}
                     placeholder="admin"
                     className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                     style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Password {isEdit && <span className="text-slate-600 text-xs">(blank = no change)</span>}
              </label>
              <input type="password" value={form.password}
                     onChange={e => toggle('password', e.target.value)}
                     placeholder={isEdit ? '••••••••' : 'optional'}
                     className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                     style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }} />
            </div>
          </div>

          {/* SSH Port + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">SSH Port</label>
              <input type="number" value={form.ssh_port}
                     onChange={e => toggle('ssh_port', parseInt(e.target.value))}
                     className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none focus:border-emerald-500"
                     style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => toggle('is_active', !form.is_active)}
                     className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                     style={{ backgroundColor: form.is_active ? '#17b584' : '#1e2736' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                       style={{ left: form.is_active ? '22px' : '2px' }} />
                </div>
                <span className="text-xs text-slate-400">Active</span>
              </label>
            </div>
          </div>

          {/* ── CSV Section (Add only) ── */}
          {!isEdit && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ backgroundColor: '#1e2736' }} />
                <span className="text-xs text-slate-600">or import multiple devices</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#1e2736' }} />
              </div>

              <div className="rounded-lg border p-4 space-y-3"
                   style={{ borderColor: '#1e2736', backgroundColor: '#0f1117' }}>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Bulk Import from CSV</p>
                  <button onClick={downloadSampleCSV}
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
                    <Download size={11} /> Sample CSV
                  </button>
                </div>

                {/* Format hint */}
                <div className="rounded text-xs font-mono px-3 py-2 text-slate-500"
                     style={{ backgroundColor: '#161b25' }}>
                  ip_address*, name, vendor*, ssh_port, role
                </div>

                {/* Shared credentials */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Shared Username</label>
                    <input value={csvUser} onChange={e => setCsvUser(e.target.value)}
                           placeholder="ipam"
                           className="w-full px-3 py-1.5 rounded-lg text-xs text-white border outline-none focus:border-emerald-500"
                           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Shared Password</label>
                    <input type="password" value={csvPass} onChange={e => setCsvPass(e.target.value)}
                           placeholder="••••••••"
                           className="w-full px-3 py-1.5 rounded-lg text-xs text-white border outline-none focus:border-emerald-500"
                           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }} />
                  </div>
                </div>

                <input ref={fileRef} type="file" accept=".csv,.txt"
                       onChange={handleFile} className="hidden" />

                {csvRows.length === 0 ? (
                  <button onClick={() => fileRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed text-xs text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
                          style={{ borderColor: '#2a3344' }}>
                    <Upload size={13} /> Choose CSV file
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-emerald-400 font-medium">
                        ✓ {fileName} — {csvRows.length} devices ready
                      </p>
                      <button onClick={() => { setCsvRows([]); setFileName('') }}
                              className="text-xs text-slate-600 hover:text-red-400 transition-colors">
                        Clear
                      </button>
                    </div>
                    <div className="rounded border overflow-hidden max-h-36 overflow-y-auto"
                         style={{ borderColor: '#1e2736' }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ backgroundColor: '#161b25' }}>
                            {['IP', 'Name', 'Vendor', 'Port', 'Role'].map(h => (
                              <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.map((r, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: '#1e2736' }}>
                              <td className="px-2 py-1.5 text-emerald-400 font-mono">{r.ip_address}</td>
                              <td className="px-2 py-1.5 text-slate-300">{r.name || '—'}</td>
                              <td className="px-2 py-1.5 text-slate-300">{r.vendor}</td>
                              <td className="px-2 py-1.5 text-slate-400">{r.ssh_port || 22}</td>
                              <td className="px-2 py-1.5 text-slate-400">{r.role || 'gateway'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#1e2736' }}>
          <button onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white border transition-colors"
                  style={{ borderColor: '#1e2736' }}>
            Cancel
          </button>
          {csvRows.length > 0 ? (
            <button onClick={handleImport} disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#6366f1' }}>
              {importing
                ? <><RefreshCw size={12} className="animate-spin" /> Importing...</>
                : <><Upload size={12} /> Import {csvRows.length} Devices</>}
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#17b584' }}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Device'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── ARP Result Modal ────────────────────────────────────────────
function ArpResultModal({ result, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-xl border shadow-2xl"
           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
             style={{ borderColor: '#1e2736' }}>
          <div>
            <h2 className="text-white font-semibold text-sm">ARP Sweep Results</h2>
            <p className="text-xs text-slate-500 mt-0.5">{result.gateway} — {result.total} entries</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#1e2736' }}>
                {['IP Address', 'MAC Address', 'Hostname', 'Interface'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.entries.map((e, i) => (
                <tr key={i} className="border-b hover:bg-white/5 transition-colors"
                    style={{ borderColor: '#1e2736' }}>
                  <td className="px-4 py-2.5 text-emerald-400 font-mono">{e.ip}</td>
                  <td className="px-4 py-2.5 text-slate-300 font-mono">{e.mac}</td>
                  <td className="px-4 py-2.5 text-slate-300">{e.hostname || <span className="text-slate-600">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.interface}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end px-6 py-4 border-t" style={{ borderColor: '#1e2736' }}>
          <button onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white border transition-colors"
                  style={{ borderColor: '#1e2736' }}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Gateway Row ─────────────────────────────────────────────────
function GatewayRow({ gateway, subnets, onEdit, onDelete, onRefresh, onPurchase }) {
  const [testing,    setTesting]    = useState(false)
  const [sweeping,   setSweeping]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [arpResult,  setArpResult]  = useState(null)
  const [expanded,   setExpanded]   = useState(false)

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const res = await api.post(`/gateways/${gateway.id}/test`)
      setTestResult(res)
      if (res.status === 'success') { toast.success('SSH connection successful'); onRefresh() }
      else toast.error(`Connection failed: ${res.message}`)
    } catch (e) { toast.error(e.message || 'Test failed') }
    finally { setTesting(false) }
  }

  const handleArpSweep = async () => {
    setSweeping(true)
    try {
      const res = await api.post(`/gateways/${gateway.id}/arp-sweep`)
      setArpResult(res)
      toast.success(`ARP sweep done — ${res.total} entries`)
    } catch (e) { toast.error(e.message || 'ARP sweep failed') }
    finally { setSweeping(false) }
  }

  const linkedSubnets = subnets.filter(s => gateway.subnet_ids.includes(s.id))

  return (
    <>
      <tr className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1e2736' }}>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(e => !e)}
                  className="text-slate-500 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full"
                 style={{ backgroundColor: gateway.is_active ? '#17b584' : '#475569' }} />
            <span className="text-sm text-white font-medium">{gateway.name || gateway.ip_address}</span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-emerald-400">{gateway.ip_address}</td>
        <td className="px-4 py-3"><Badge label={gateway.vendor} colors={VENDOR_COLOR[gateway.vendor]} /></td>
        <td className="px-4 py-3"><Badge label={gateway.role}   colors={ROLE_COLOR[gateway.role]}   /></td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {gateway.last_seen
            ? new Date(gateway.last_seen).toLocaleString()
            : <span className="text-slate-700">Never</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => onPurchase()} title="Test SSH (Full Version)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-colors">
              <Lock size={13} />
            </button>
            <button onClick={() => onPurchase()} title="ARP Sweep (Full Version)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-colors">
              <Radio size={13} />
            </button>
            <button onClick={() => onPurchase()} title="Edit (Full Version)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onPurchase()} title="Delete (Full Version)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr style={{ backgroundColor: '#0f1117' }}>
          <td colSpan={7} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Details</p>
                <div className="space-y-1">
                  {[
                    ['Username', gateway.username || '—'],
                    ['SSH Port', gateway.ssh_port],
                    ['Status',   gateway.is_active ? 'Active' : 'Disabled'],
                    ['Added',    new Date(gateway.created_at).toLocaleDateString()],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-slate-500 w-24">{k}</span>
                      <span className={k === 'Status'
                        ? gateway.is_active ? 'text-emerald-400' : 'text-slate-500'
                        : 'text-slate-300'}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
                  Linked Subnets ({linkedSubnets.length})
                </p>
                {linkedSubnets.length === 0
                  ? <p className="text-slate-600">No subnets linked</p>
                  : linkedSubnets.map(s => (
                      <div key={s.id} className="flex gap-2">
                        <span className="text-emerald-400 font-mono">{s.network}/{s.cidr}</span>
                        <span className="text-slate-500">{s.name}</span>
                      </div>
                    ))}
              </div>
            </div>
            {testResult && (
              <div className="mt-3 p-2 rounded border text-xs font-mono"
                   style={{
                     borderColor: testResult.status === 'success' ? '#17b584' : '#ef4444',
                     backgroundColor: testResult.status === 'success' ? 'rgba(23,181,132,0.08)' : 'rgba(239,68,68,0.08)',
                     color: testResult.status === 'success' ? '#17b584' : '#f87171',
                   }}>
                {testResult.status === 'success' ? `✓ ${testResult.output_preview}` : `✗ ${testResult.message}`}
              </div>
            )}
          </td>
        </tr>
      )}

      {arpResult && <ArpResultModal result={arpResult} onClose={() => setArpResult(null)} />}
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export function DeviceInventory() {
  const [gateways,  setGateways]  = useState([])
  const [subnets,   setSubnets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [showPurchase, setPurchase] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [gw, sn] = await Promise.all([api.get('/gateways'), api.get('/subnets')])
      setGateways(gw); setSubnets(sn)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (gw) => {
    try {
      await api.delete(`/gateways/${gw.id}`)
      toast.success(`${gw.name || gw.ip_address} deleted`)
      setDelTarget(null); load()
    } catch (e) { toast.error(e.message || 'Delete failed') }
  }

  return (
    <div className="space-y-6">
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold text-white">Device Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage network gateways and switches for ARP sweep discovery</p>
        </div>
        <button onClick={() => setPurchase(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#17b584' }}>
          <Lock size={15} /> Add Device
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Devices',   value: gateways.length,                                                                                                   color: '#17b584' },
          { label: 'Active',          value: gateways.filter(g => g.is_active).length,                                                                          color: '#60a5fa' },
          { label: 'Gateways',        value: gateways.filter(g => g.role === 'gateway').length,                                                                  color: '#a78bfa' },
          { label: 'Last Seen Today', value: gateways.filter(g => g.last_seen && new Date(g.last_seen).toDateString() === new Date().toDateString()).length,     color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4"
               style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden"
           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-slate-500 font-medium"
                style={{ borderColor: '#1e2736', backgroundColor: '#0f1117' }}>
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">IP Address</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Last Seen</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">Loading...</td></tr>
            ) : gateways.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                No devices added yet — click "Add Device" to get started
              </td></tr>
            ) : gateways.map(gw => (
              <GatewayRow key={gw.id} gateway={gw} subnets={subnets}
                          onEdit={gw => setModal(gw)}
                          onDelete={gw => setDelTarget(gw)}
                          onRefresh={load}
                          onPurchase={() => setPurchase(true)} />
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <GatewayModal gateway={modal === 'add' ? null : modal}
                      subnets={subnets}
                      onClose={() => setModal(null)}
                      onSaved={load} />
      )}

      {delTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-xl border p-6 shadow-2xl"
               style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
            <h3 className="text-white font-semibold text-sm mb-2">Delete Device?</h3>
            <p className="text-slate-400 text-xs mb-5">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{delTarget.name || delTarget.ip_address}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelTarget(null)}
                      className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white border"
                      style={{ borderColor: '#1e2736' }}>Cancel</button>
              <button onClick={() => handleDelete(delTarget)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

