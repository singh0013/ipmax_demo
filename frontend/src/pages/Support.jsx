import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, Upload, FileText, Database, Shield, CheckCircle2,
         XCircle, RefreshCw, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { PurchaseBanner } from '../components/PurchaseBanner'
import { auth } from '../api/client'

// ── API helpers ──────────────────────────────────────────────────
const token = () => auth.getToken()
const headers = () => ({ Authorization: `Bearer ${token()}` })

async function downloadFile(url, method = 'GET', filename) {
  const res = await fetch(url, { method, headers: headers() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Download failed' }))
    throw new Error(err.detail || 'Download failed')
  }
  const blob = await res.blob()
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = filename || 'download'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Section Card ────────────────────────────────────────────────
function SectionCard({ icon: Icon, iconColor, title, description, children }) {
  return (
    <div className="rounded-xl border p-6"
         style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 rounded-xl shrink-0"
             style={{ backgroundColor: `${iconColor}18` }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Confirm Modal ───────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', zIndex: 9999 }}>
      <div onClick={onCancel}
           style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998 }} />
      <div className="card animate-fade-in"
           style={{ position: 'relative', zIndex: 9999, width: '100%', maxWidth: '420px',
                    padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ padding: '8px', backgroundColor: 'rgba(239,68,68,0.1)',
                        borderRadius: '8px', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: '#f87171' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm}
                  style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white',
                           borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px',
                           fontWeight: 500 }}>
            Yes, Restore
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Page ────────────────────────────────────────────────────
export function SupportPage() {
  const [status,       setStatus]      = useState(null)
  const [logsLoading,  setLogsLoading]  = useState(false)
  const [backupLoading,setBackupLoading]= useState(false)
  const [restoreLoading,setRestoreLoading] = useState(false)
  const [restoreJob,    setRestoreJob]    = useState(null)
  const [restoreSteps, setRestoreSteps] = useState([])
  const [showPurchase, setPurchase]     = useState(false)

  // Poll restore job status
  useEffect(() => {
    if (!restoreJob || restoreJob.status !== 'running') {
      clearInterval(restoreTimer.current)
      return
    }
    restoreTimer.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/support/backup/restore/${restoreJob.job_id}`, { headers: headers() })
        const data = await res.json()

        // Use steps array from backend directly
        if (data.steps) setRestoreSteps(data.steps.map(s => ({ text: s, status: data.status })))

        setRestoreJob(j => ({ ...j, ...data }))

        if (data.status !== 'running') {
          clearInterval(restoreTimer.current)
          setRestoreLoading(false)
          if (data.status === 'completed') toast.success('Database restored successfully!')
          else toast.error(data.message)
        }
      } catch (e) {}
    }, 1000)  // 1s polling for smoother step updates
    return () => clearInterval(restoreTimer.current)
  }, [restoreJob?.job_id, restoreJob?.status])
  const [confirmRestore, setConfirmRestore] = useState(null)
  const fileRef       = useRef()
  const restoreTimer  = useRef(null)

  // Load status on mount
  useEffect(() => {
    fetch('/api/support/status', { headers: headers() })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  // ── Download Logs ───────────────────────────────────────────
  const handleDownloadLogs = async () => {
    setLogsLoading(true)
    try {
      const date = new Date().toISOString().slice(0, 10)
      await downloadFile('/api/support/logs/download', 'GET',
                         `ipmax_logs_${date}.zip`)
      toast.success('Logs downloaded!')
    } catch (e) {
      toast.error(e.message || 'Failed to download logs')
    } finally {
      setLogsLoading(false)
    }
  }

  // ── Download Backup ─────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setBackupLoading(true)
    try {
      const date = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
      await downloadFile('/api/support/backup/download', 'POST',
                         `ipmax_backup_${date}.sql`)
      toast.success('Backup downloaded!')
    } catch (e) {
      toast.error(e.message || 'Failed to create backup')
    } finally {
      setBackupLoading(false)
    }
  }

  // ── Restore ─────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.sql')) {
      toast.error('Only .sql files are allowed')
      return
    }
    setConfirmRestore(file)
    e.target.value = ''
  }

  const handleRestore = async () => {
    const file = confirmRestore
    setConfirmRestore(null)
    setRestoreLoading(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/support/backup/restore', {
        method: 'POST',
        headers: headers(),
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Restore failed')

      // Start polling
      setRestoreSteps([])
      setRestoreJob({ job_id: data.job_id, status: 'running', message: data.message })
      toast.success('Restore started — please wait...')
    } catch (e) {
      toast.error(e.message || 'Restore failed')
      setRestoreLoading(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Support</h1>
        <p className="text-sm text-slate-500 mt-1">
          Logs, backup and restore tools for IPMAX
        </p>
      </div>

      {/* Status bar */}
      {status && (
        <div className="rounded-xl border p-4 flex items-center gap-6"
             style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
          <div className="flex items-center gap-2">
            {status.db_connected
              ? <CheckCircle2 size={14} style={{ color: '#17b584' }} />
              : <XCircle size={14} style={{ color: '#ef4444' }} />}
            <span className="text-xs text-slate-400">
              Database {status.db_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {status.pg_dump_available
              ? <CheckCircle2 size={14} style={{ color: '#17b584' }} />
              : <XCircle size={14} style={{ color: '#f59e0b' }} />}
            <span className="text-xs text-slate-400">
              pg_dump {status.pg_dump_available ? 'Available' : 'Not found'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">v{status.version}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">TZ: {status.tz}</span>
          </div>
        </div>
      )}

      {/* Download Logs */}
      <SectionCard
        icon={FileText}
        iconColor="#60a5fa"
        title="Download Logs"
        description="Download all logs as a ZIP file for troubleshooting">

        <div className="rounded-lg border p-4 mb-4"
             style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }}>
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
            ZIP contains:
          </p>
          <div className="space-y-1.5">
            {[
              ['backend_app.log',      'FastAPI/Uvicorn application logs'],
              ['frontend_nginx.log',   'Nginx access & error logs'],
              ['activity_log.json',    'All discovery & import job history'],
              ['audit_log.json',       'All CRUD changes (create/update/delete)'],
              ['restore_history.json', 'DB restore attempts & errors (if any)'],
              ['system_info.txt',      'DB stats, environment, recent activity'],
            ].map(([file, desc]) => (
              <div key={file} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-emerald-400 w-40 shrink-0">{file}</span>
                <span className="text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setPurchase(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#60a5fa' }}>
          <Lock size={14} /> Download Logs ZIP
        </button>
      </SectionCard>

      {/* DB Backup */}
      <SectionCard
        icon={Database}
        iconColor="#17b584"
        title="Database Backup"
        description="Download a full PostgreSQL backup — can be used to restore completely">

        <div className="rounded-lg border p-4 mb-4"
             style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 mb-1">Format</p>
              <p className="text-slate-300">PostgreSQL plain SQL dump</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Filename</p>
              <p className="text-slate-300 font-mono">ipmax_backup_YYYY-MM-DD.sql</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Includes</p>
              <p className="text-slate-300">All tables, data, sequences</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Use for</p>
              <p className="text-slate-300">Full restore on new server</p>
            </div>
          </div>
        </div>

        <button onClick={() => setPurchase(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#17b584' }}>
          <Lock size={14} /> Download Backup (.sql)
        </button>
      </SectionCard>

      {/* DB Restore */}
      <SectionCard
        icon={Shield}
        iconColor="#f59e0b"
        title="Database Restore"
        description="Upload a .sql backup file to restore the database — WARNING: this will overwrite all current data">

        <div className="rounded-lg border p-4 mb-4"
             style={{ backgroundColor: 'rgba(239,68,68,0.04)',
                      borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} style={{ color: '#f87171', marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#f87171' }}>
              Restoring will <strong>overwrite all current data</strong> including subnets, IPs,
              users and logs. Take a backup first before restoring.
            </p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".sql"
               onChange={handleFileSelect} className="hidden" />

        {/* Restore progress */}
        {restoreJob && (
          <div className="rounded-lg border p-4 mb-4"
               style={{ backgroundColor: '#0f1117', borderColor: '#1e2736' }}>

            {/* Current status */}
            <div className="flex items-center gap-3 mb-3">
              {restoreJob.status === 'running' && (
                <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: '#f59e0b' }} />
              )}
              {restoreJob.status === 'completed' && (
                <CheckCircle2 size={14} className="shrink-0" style={{ color: '#17b584' }} />
              )}
              {restoreJob.status === 'error' && (
                <XCircle size={14} className="shrink-0" style={{ color: '#ef4444' }} />
              )}
              <span className="text-xs font-medium" style={{
                color: restoreJob.status === 'completed' ? '#17b584'
                     : restoreJob.status === 'error'     ? '#f87171'
                     : '#f59e0b'
              }}>
                {restoreJob.status === 'running' ? 'Restoring...' : restoreJob.status === 'completed' ? 'Completed!' : 'Failed'}
              </span>
            </div>

            {/* Infinite pulse bar */}
            {restoreJob.status === 'running' && (
              <div style={{ height: '3px', borderRadius: '2px', backgroundColor: '#1e2736',
                            overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ height: '100%', borderRadius: '2px', backgroundColor: '#f59e0b',
                              width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            )}

            {/* Step history */}
            {restoreSteps.length > 0 && (
              <div className="space-y-1.5 mt-2 border-t pt-3"
                   style={{ borderColor: '#1e2736' }}>
                {restoreSteps.map((step, i) => {
                  const isLast    = i === restoreSteps.length - 1
                  const jobDone   = restoreJob?.status !== 'running'
                  const isRunning = isLast && !jobDone
                  const isError   = jobDone && isLast && restoreJob?.status === 'error'
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {isError
                        ? <XCircle size={12} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                        : isRunning
                        ? <RefreshCw size={12} className="shrink-0 mt-0.5 animate-spin" style={{ color: '#f59e0b' }} />
                        : <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: '#17b584' }} />
                      }
                      <span style={{ color: isError ? '#f87171' : isRunning ? '#e2e8f0' : '#64748b' }}>
                        {step.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {restoreJob.status === 'running' && (
              <p className="text-xs text-slate-600 mt-2">Do not close this page</p>
            )}
          </div>
        )}

        <button onClick={() => setPurchase(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#f59e0b' }}>
          <Lock size={14} /> Upload & Restore (.sql)
        </button>
      </SectionCard>

      {/* Confirm restore dialog */}
      {confirmRestore && (
        <ConfirmModal
          title="Restore Database?"
          message={`Are you sure you want to restore from "${confirmRestore.name}"? All current data will be overwritten. This cannot be undone.`}
          onConfirm={handleRestore}
          onCancel={() => setConfirmRestore(null)}
        />
      )}
    </div>
  )
}
