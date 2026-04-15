import { useEffect, useState, useRef } from 'react'
import { Activity, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
         Upload, Download, RefreshCw, StopCircle } from 'lucide-react'
import { auth } from '../api/client'
import { Spinner, EmptyState } from '../components/UI'

const JOB_LABELS = {
  import_ips:      { label: 'Import IPs',      icon: Upload,   color: '#60a5fa' },
  import_subnets:  { label: 'Import Subnets',  icon: Upload,   color: '#a78bfa' },
  export_ips:      { label: 'Export IPs',      icon: Download, color: '#34d399' },
  export_subnets:  { label: 'Export Subnets',  icon: Download, color: '#34d399' },
  export_audit:    { label: 'Export Audit',    icon: Download, color: '#34d399' },
  discovery:       { label: 'Discovery',       icon: Activity, color: '#f59e0b' },
}

const STATUS_STYLES = {
  running:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#f59e0b',  label: 'Running'   },
  completed: { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399',  label: 'Completed' },
  error:     { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171',  label: 'Error'     },
}

const LOG_COLORS = {
  imported: '#34d399',
  updated:  '#60a5fa',
  skipped:  '#f59e0b',
  error:    '#f87171',
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}

function duration(start, end) {
  if (!end) return null
  const secs = Math.round((new Date(end) - new Date(start)) / 1000)
  return secs < 60 ? `${secs}s` : `${Math.floor(secs/60)}m ${secs%60}s`
}

function JobRow({ job: initialJob }) {
  const [expanded, setExpanded] = useState(false)
  const [job, setJob]           = useState(initialJob)
  const [stopping, setStopping] = useState(false)
  const timerRef                = useRef(null)

  // Live poll if running
  useEffect(() => {
    setJob(initialJob)
  }, [initialJob])

  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    if (job.status !== 'running') return
    const poll = async () => {
      try {
        const res  = await fetch(`/api/import/activity/${job.id}`,
          { headers: { Authorization: `Bearer ${auth.getToken()}` } })
        const data = await res.json()
        // Don't overwrite local stopped state
        if (stopped) return
        setJob(data)
        if (data.status !== 'running') clearInterval(timerRef.current)
      } catch (e) {}
    }
    timerRef.current = setInterval(poll, 2000)
    return () => clearInterval(timerRef.current)
  }, [job.status, job.id, stopped])

  const handleStop = async (e) => {
    e.stopPropagation()
    setStopping(true)
    try {
      await fetch(`/api/discovery/stop/${job.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.getToken()}` }
      })
      setStopped(true)
      clearInterval(timerRef.current)
      setJob(j => ({ ...j, status: 'error', summary: (j.summary || '') + ' — Stopped by user' }))
    } catch (e) {}
    finally { setStopping(false) }
  }
  const meta    = JOB_LABELS[job.job_type] || { label: job.job_type, icon: Activity, color: '#94a3b8' }
  const status  = STATUS_STYLES[job.status] || STATUS_STYLES.error
  const Icon    = meta.icon
  const dur     = duration(job.started_at, job.finished_at)
  const hasLogs = (job.logs && job.logs.length > 0) || job.status === 'running'

  return (
    <div className="border-b border-surface-border last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer"
           onClick={() => hasLogs && setExpanded(v => !v)}>

        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
             style={{ backgroundColor: `${meta.color}18` }}>
          <Icon size={14} style={{ color: meta.color }} />
        </div>

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-white">{meta.label}</span>
            {job.started_by === 'scheduler' && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                scheduled
              </span>
            )}
            {job.filename && (
              <span className="text-xs text-slate-500 truncate max-w-xs" title={job.filename}>
                — {job.filename}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{job.started_by}</span>
            <span>·</span>
            <span title={new Date(job.started_at).toLocaleString()}>{timeAgo(job.started_at)}</span>
            {dur && <><span>·</span><span>{dur}</span></>}
          </div>
        </div>

        {/* Stats */}
        {job.total > 0 && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="text-slate-400">{job.total} rows</span>
            {job.succeeded > 0 && <span style={{ color: '#34d399' }}>✓ {job.succeeded}</span>}
            {job.failed > 0    && <span style={{ color: '#f87171' }}>✗ {job.failed}</span>}
          </div>
        )}

        {/* Status badge */}
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: status.bg, border: `1px solid ${status.border}`, color: status.text }}>
          {status.status === 'running' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ backgroundColor: status.text }} />}
          {status.label}
        </span>

        {/* Stop button — only for running discovery jobs */}
        {job.status === 'running' && job.job_type === 'discovery' && (
          <button onClick={handleStop} disabled={stopping}
                  title="Stop discovery"
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                           color: '#f87171' }}>
            {stopping
              ? <RefreshCw size={11} className="animate-spin" />
              : <StopCircle size={11} />}
            Stop
          </button>
        )}

        {/* Expand arrow */}
        {hasLogs && (
          <div className="text-slate-500 shrink-0">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </div>

      {/* Expanded logs */}
      {expanded && hasLogs && (
        <div className="px-5 pb-4 animate-fade-in">
          {job.summary && (
            <p className="text-xs text-slate-400 mb-3 px-3 py-2 rounded-lg"
               style={{ backgroundColor: '#0f1117' }}>{job.summary}</p>
          )}

          {/* Live progress for running discovery */}
          {job.status === 'running' && job.total > 0 && (
            <div className="mb-3 px-3 py-3 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Scanned {job.processed}/{job.total} IPs</span>
                <span>{Math.round((job.processed / job.total) * 100)}%</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#1e2736' }}>
                <div style={{ height: '100%', borderRadius: '2px', backgroundColor: '#17b584',
                              width: `${Math.round((job.processed / job.total) * 100)}%`,
                              transition: 'width 0.5s ease' }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span style={{ color: '#34d399' }}>✓ {job.succeeded} alive</span>
                <span style={{ color: '#64748b' }}>✗ {job.failed} no response</span>
              </div>
            </div>
          )}
          <div className="rounded-lg overflow-hidden border border-surface-border">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: '#0f1117' }}>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Row</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Status</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {job.logs.map((entry, i) => (
                    <tr key={i} className="border-t border-surface-border">
                      <td className="px-3 py-1.5 text-slate-500">{entry.row || '—'}</td>
                      <td className="px-3 py-1.5">
                        <span style={{ color: LOG_COLORS[entry.status] || '#94a3b8' }}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">
                        {entry.ip || entry.network || ''}
                        {entry.subnet && <span className="text-slate-600 ml-1">→ {entry.subnet}</span>}
                        {entry.msg    && <span className="text-slate-500 ml-1">{entry.msg}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ActivityLogPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAuto] = useState(false)
  const timerRef              = useRef(null)

  const load = async () => {
    try {
      const res = await fetch('/api/import/activity?limit=100', {
        headers: { Authorization: `Bearer ${auth.getToken()}` }
      })
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(load, 3000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [autoRefresh])

  const hasRunning = jobs.some(j => j.status === 'running')

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">{jobs.length} activities</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRunning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 px-3 py-1.5 rounded-lg"
                 style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Job running
            </div>
          )}
          <button onClick={() => setAuto(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
                    ${autoRefresh ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-surface-border'}`}
                  style={{ backgroundColor: autoRefresh ? 'rgba(52,211,153,0.08)' : '#161b25' }}>
            <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh'}
          </button>
          <button onClick={load} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : jobs.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet"
          description="Import, export, and discovery jobs will appear here" />
      ) : (
        <div className="card overflow-hidden">
          {jobs.map(job => <JobRow key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}
