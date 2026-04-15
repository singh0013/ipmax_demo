import { useEffect, useState } from 'react'
import { PurchaseBanner } from '../components/PurchaseBanner'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2, Clock, RefreshCw, Calendar, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { Spinner, EmptyState, Can } from '../components/UI'

const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const METHODS = {
  auto: 'Auto (ARP if gateway, else TCP)',
  arp:  'ARP Sweep',
  tcp:  'TCP Probe',
}

const FREQ_COLOR = {
  none:   { bg: 'rgba(100,116,139,0.15)', text: '#64748b', label: 'Manual'  },
  daily:  { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa', label: 'Daily'   },
  weekly: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa', label: 'Weekly'  },
}

function Badge({ freq }) {
  const c = FREQ_COLOR[freq] || FREQ_COLOR.none
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatNextRun(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString([], { month: 'short', day: 'numeric',
                                 hour: '2-digit', minute: '2-digit' })
}

// ── Schedule Modal ───────────────────────────────────────────────
function ScheduleModal({ schedule, subnets, groupSubnetIds, onClose, onSaved }) {
  const isEdit = !!schedule

  const [form, setForm] = useState({
    task_name:   schedule?.task_name  || '',
    subnet_ids:  groupSubnetIds || (schedule?.subnet_id ? [schedule.subnet_id] : []),
    frequency:   schedule?.frequency   || 'daily',
    run_time:    schedule?.run_time    || '02:00',
    day_of_week: schedule?.day_of_week ?? 0,
    method:      schedule?.method      || 'auto',
    is_active:   schedule?.is_active   ?? true,
  })
  const [saving, setSaving] = useState(false)

  const toggle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSubnet = (id) => {
    setForm(f => ({
      ...f,
      subnet_ids: f.subnet_ids.includes(id)
        ? f.subnet_ids.filter(s => s !== id)
        : [...f.subnet_ids, id],
    }))
  }

  const handleSave = async () => {
    if (!form.task_name.trim()) {
      toast.error('Task name is required')
      return
    }
    if (form.subnet_ids.length === 0) {
      toast.error('Select at least one subnet')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        // Delete all existing schedules for this task first
        const existing = await api.get('/schedules')
        const toDelete = existing.filter(s => s.task_name === schedule.task_name)
        for (const s of toDelete) {
          await api.delete(`/schedules/${s.id}`)
        }
      }
      // Save one schedule per subnet
      for (const sid of form.subnet_ids) {
        await api.post('/schedules', { ...form, subnet_id: sid })
      }
      toast.success(`Task saved for ${form.subnet_ids.length} subnet(s)`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', zIndex: 9999 }}>
      <div onClick={onClose}
           style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9998 }} />

      <div className="card animate-fade-in"
           style={{ position: 'relative', zIndex: 9999, width: '100%', maxWidth: '520px',
                    padding: '1.5rem', maxHeight: '88vh', overflowY: 'auto',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(167,139,250,0.1)' }}>
              <Calendar size={18} style={{ color: '#a78bfa' }} />
            </div>
            <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
              {isEdit ? 'Edit Task' : 'Add Discovery Scan'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: '#64748b', background: 'none',
                                             border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Task Name */}
          <div>
            <label className="label" style={{ marginBottom: '6px', display: 'block' }}>
              Task Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input className="input" value={form.task_name}
                   onChange={e => toggle('task_name', e.target.value)}
                   placeholder="e.g. Daily Network Scan, Weekly DC-1 Discovery" />
          </div>

          {/* Subnet selector — show always */}
          <div>
            <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
              Select Subnets <span style={{ color: '#ef4444' }}>*</span>
            </label>
              <div style={{ borderRadius: '10px', border: '1px solid #1e2736',
                            backgroundColor: '#0f1117', maxHeight: '160px', overflowY: 'auto' }}>
                {subnets.length === 0 ? (
                  <p style={{ padding: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                    No subnets available
                  </p>
                ) : subnets.map(s => (
                  <label key={s.id}
                         style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '9px 12px', cursor: 'pointer',
                                  backgroundColor: form.subnet_ids.includes(s.id) ? 'rgba(167,139,250,0.06)' : 'transparent',
                                  borderBottom: '1px solid #1e2736' }}>
                    <input type="checkbox"
                           checked={form.subnet_ids.includes(s.id)}
                           onChange={() => toggleSubnet(s.id)}
                           style={{ accentColor: '#a78bfa', width: '14px', height: '14px' }} />
                    <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1 }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {s.network}/{s.cidr}
                    </span>
                  </label>
                ))}
              </div>
              {form.subnet_ids.length > 0 && (
                <p style={{ fontSize: '11px', color: '#a78bfa', marginTop: '6px' }}>
                  {form.subnet_ids.length} subnet(s) selected
                </p>
              )}
            </div>

          {/* Frequency */}
          <div>
            <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Frequency</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['daily', 'weekly', 'none'].map(f => (
                <button key={f} onClick={() => toggle('frequency', f)}
                        style={{ padding: '9px', borderRadius: '8px', cursor: 'pointer',
                                 fontSize: '13px', fontWeight: 500, border: '1px solid',
                                 borderColor: form.frequency === f ? 'rgba(167,139,250,0.5)' : '#1e2736',
                                 backgroundColor: form.frequency === f ? 'rgba(167,139,250,0.1)' : '#0f1117',
                                 color: form.frequency === f ? '#a78bfa' : '#94a3b8' }}>
                  {f === 'none' ? 'Manual' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Time + Day */}
          {form.frequency !== 'none' && (
            <div style={{ display: 'grid',
                          gridTemplateColumns: form.frequency === 'weekly' ? '1fr 1fr' : '1fr',
                          gap: '12px' }}>
              <div>
                <label className="label" style={{ marginBottom: '6px', display: 'block' }}>Run Time</label>
                <input type="time" className="input" value={form.run_time}
                       onChange={e => toggle('run_time', e.target.value)} />
              </div>
              {form.frequency === 'weekly' && (
                <div>
                  <label className="label" style={{ marginBottom: '6px', display: 'block' }}>Day of Week</label>
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
              <label className="label" style={{ marginBottom: '6px', display: 'block' }}>Discovery Method</label>
              <select className="input" value={form.method}
                      onChange={e => toggle('method', e.target.value)}>
                {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div onClick={() => toggle('is_active', !form.is_active)}
                 style={{ width: '40px', height: '20px', borderRadius: '10px', position: 'relative',
                          backgroundColor: form.is_active ? '#a78bfa' : '#1e2736',
                          transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '2px', width: '16px', height: '16px',
                            borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
                            left: form.is_active ? '22px' : '2px' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Schedule Active</span>
          </label>

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
            <button onClick={handleSave} disabled={saving} className="btn-primary"
                    style={{ backgroundColor: '#a78bfa', borderColor: '#a78bfa' }}>
              {saving ? 'Saving…' : isEdit ? 'Update Task' : `Add Task`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Page ────────────────────────────────────────────────────
export function SchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [subnets,   setSubnets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,      setModal]      = useState(null)
  const [deleting,   setDeleting]   = useState(null)
  const [runningJob, setRunningJob] = useState(null)
  const [showPurchase, setPurchase] = useState(false)

  const load = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const [sc, sn, jobs] = await Promise.all([
        api.get('/schedules'),
        api.get('/subnets/'),
        api.get('/import/activity?limit=10'),
      ])
      setSchedules(sc)
      setSubnets(sn)
      const running = jobs.find(j => j.status === 'running' && j.started_by === 'scheduler')
      setRunningJob(running || null)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  // Initial load
  useEffect(() => { load(true) }, [])

  // Auto-poll when scheduler job is running
  useEffect(() => {
    if (!runningJob) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [runningJob])

  const handleDelete = async (sc) => {
    try {
      // Delete all schedules in group if _group exists
      const toDelete = sc._group || [sc]
      for (const s of toDelete) {
        await api.delete(`/schedules/${s.id}`)
      }
      toast.success('Task deleted')
      setDeleting(null)
      load()
    } catch (e) { toast.error(e.message || 'Delete failed') }
  }

  const handleRunNow = async (sc) => {
    try {
      await api.post('/discovery/arp-sweep', {
        gateway_id: 0,  // auto select
        subnet_ids: [sc.subnet_id],
      }).catch(async () => {
        // Fallback to TCP if ARP fails
        await api.post('/discovery/scan', {
          subnet_ids: [sc.subnet_id],
          timeout: 1.0,
        })
      })
      toast.success(`Discovery started for ${sc.subnet_name}`)
      load()
    } catch (e) { toast.error(e.message || 'Failed to start') }
  }

  const toggleActive = async (group, currentActive) => {
    try {
      await Promise.all(group.map(s => api.patch(`/schedules/${s.id}`, { is_active: !currentActive })))
      toast.success(`Task ${!currentActive ? 'enabled' : 'disabled'}`)
      load()
    } catch (e) { toast.error(e.message) }
  }

  const activeCount   = new Set(schedules.filter(s => s.is_active && s.frequency !== 'none' && s.subnet_id).map(s => s.task_name)).size
  const uniqueTasks   = new Set(schedules.filter(s => s.subnet_id).map(s => s.task_name)).size
  const scheduledSids = new Set(schedules.map(s => s.subnet_id).filter(Boolean))
  const unscheduled   = subnets.filter(s => !scheduledSids.has(s.id))

  return (
    <div className="animate-fade-in space-y-6">
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeCount} active task{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {runningJob && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                 style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                          color: '#f59e0b' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f59e0b' }} />
              Scheduled scan running
            </div>
          )}
          <button onClick={load}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border text-slate-400 transition-colors"
                  style={{ borderColor: '#1e2736', backgroundColor: '#161b25' }}>
            <RefreshCw size={12} /> Refresh
          </button>
          <Can role="admin">
            <button onClick={() => setPurchase(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: '#a78bfa' }}>
              <Plus size={15} /> Add Discovery Scan
            </button>
          </Can>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tasks',         value: uniqueTasks, color: '#a78bfa' },
          { label: 'Auto (Daily/Weekly)', value: activeCount, color: '#17b584' },
          { label: 'Unscheduled Subnets', value: unscheduled.length, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4"
               style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? <Spinner /> : schedules.filter(s => s.subnet_id).length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-1">No tasks yet</p>
          <p className="text-sm text-slate-600 mb-5">Add a discovery scan to automate</p>
          <Can role="admin">
            <button onClick={() => setPurchase(true)} className="btn-primary mx-auto"
                    style={{ backgroundColor: '#a78bfa' }}>
              <Plus size={14} /> Add Discovery Scan
            </button>
          </Can>
        </div>
      ) : (() => {
        // Group schedules by task_name
        const grouped = {}
        schedules.filter(s => s.subnet_id).forEach(sc => {
          const key = sc.task_name || sc.subnet_name || sc.id
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(sc)
        })

        return (
        <div className="rounded-xl border overflow-hidden"
             style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-slate-500 font-medium"
                  style={{ borderColor: '#1e2736', backgroundColor: '#0f1117' }}>
                <th className="px-5 py-3 text-left">Task</th>
                <th className="px-5 py-3 text-left">Frequency</th>
                <th className="px-5 py-3 text-left">Schedule</th>
                <th className="px-5 py-3 text-left">Method</th>
                <th className="px-5 py-3 text-left">Last Run</th>
                <th className="px-5 py-3 text-left">Next Run</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([taskName, group]) => {
                const sc = group[0] // representative schedule
                const isRunning = runningJob && group.some(s =>
                  runningJob.filename?.includes(s.subnet_name)
                )
                return (
                <tr key={taskName} className="border-b hover:bg-white/5 transition-colors"
                    style={{ borderColor: '#1e2736' }}>

                  {/* Task Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium">
                        {taskName || <span className="text-slate-500">Unnamed</span>}
                      </span>
                      <span className="text-xs text-slate-600">
                        {group.length} subnet{group.length !== 1 ? 's' : ''}
                      </span>
                      {isRunning && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                                style={{ backgroundColor: '#f59e0b' }} />
                          Running
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Frequency badge */}
                  <td className="px-5 py-3.5">
                    <Badge freq={sc.frequency} />
                  </td>

                  {/* Schedule time */}
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                    {sc.frequency === 'daily'
                      ? `Daily at ${sc.run_time}`
                      : sc.frequency === 'weekly'
                      ? `${DAYS[sc.day_of_week]} at ${sc.run_time}`
                      : 'On Demand'}
                  </td>

                  {/* Method */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-slate-400">
                      {sc.method === 'auto' ? 'Auto' : sc.method === 'arp' ? 'ARP' : 'TCP'}
                    </span>
                  </td>

                  {/* Last run */}
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {timeAgo(sc.last_run_at)}
                  </td>

                  {/* Next run */}
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {sc.frequency === 'none'
                      ? <span className="text-slate-600">—</span>
                      : sc.is_active
                      ? formatNextRun(sc.next_run_at)
                      : <span className="text-slate-600">Paused</span>}
                  </td>

                  {/* Active toggle — locked */}
                  <td className="px-5 py-3.5">
                    <div onClick={() => setPurchase(true)}
                         style={{ width: '36px', height: '18px', borderRadius: '9px', position: 'relative',
                                  backgroundColor: sc.is_active ? '#a78bfa' : '#1e2736',
                                  transition: 'background 0.2s', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', top: '2px', width: '14px', height: '14px',
                                    borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
                                    left: sc.is_active ? '20px' : '2px' }} />
                    </div>
                  </td>

                  {/* Actions — locked */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPurchase(true)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setPurchase(true)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )
      })()}


      {/* Unscheduled subnets hint */}
      {unscheduled.length > 0 && (
        <div className="rounded-xl border p-4"
             style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">
            Subnets without schedule ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(s => (
              <span key={s.id} className="text-xs px-2 py-1 rounded font-mono"
                    style={{ backgroundColor: '#0f1117', color: '#64748b',
                             border: '1px solid #1e2736' }}>
                {s.network}/{s.cidr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ScheduleModal
          schedule={modal === 'add' ? null : modal.sc}
          subnets={subnets}
          groupSubnetIds={modal === 'add' ? null : modal.groupSubnetIds}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* Delete confirm */}
      {deleting && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '1rem', zIndex: 9999 }}>
          <div onClick={() => setDeleting(null)}
               style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998 }} />
          <div className="card" style={{ position: 'relative', zIndex: 9999, width: '100%',
                                         maxWidth: '380px', padding: '1.5rem' }}>
            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>
              Delete Schedule?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
              Schedule for <span style={{ color: 'white' }}>{deleting.subnet_name || 'Global'}</span> will be removed.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleting)}
                      style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white',
                               borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
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
