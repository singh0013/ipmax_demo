import { useEffect, useState, useCallback } from 'react'
import { Shield, X, Download } from 'lucide-react'
import { api } from '../api/client'
import { Spinner, EmptyState } from '../components/UI'

const ACTION_STYLES = {
  CREATE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  UPDATE: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border border-red-500/30',
}

const TABLE_LABELS = {
  subnets:     'Subnet',
  ip_addresses:'IP Address',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function AuditLog() {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [actionFilter, setAction] = useState('')
  const [tableFilter, setTable]   = useState('')
  const [expanded, setExpanded]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.getAuditLogs({ action: actionFilter || undefined, table_name: tableFilter || undefined })
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [actionFilter, tableFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">{logs.length} entries</p>
        </div>
        <button onClick={() => window.open('/api/import/audit/export', '_blank')} className="btn-secondary">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="input w-auto" value={actionFilter} onChange={e => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <select className="input w-auto" value={tableFilter} onChange={e => setTable(e.target.value)}>
          <option value="">All tables</option>
          <option value="subnets">Subnets</option>
          <option value="ip_addresses">IP Addresses</option>
        </select>
        {(actionFilter || tableFilter) && (
          <button onClick={() => { setAction(''); setTable('') }} className="btn-secondary">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState icon={Shield} title="No audit entries yet"
          description="Changes to subnets and IPs will appear here" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Time', 'Action', 'Table', 'Record', 'Changed By', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <>
                  <tr key={log.id}
                      className={`border-b border-surface-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer
                                  ${i % 2 === 0 ? '' : 'bg-surface-DEFAULT/20'}`}
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                      <span title={new Date(log.created_at).toLocaleString()}>{timeAgo(log.created_at)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ACTION_STYLES[log.action]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {TABLE_LABELS[log.table_name] || log.table_name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-slate-400">{String(log.record_id).slice(0, 8)}…</span>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">{log.changed_by}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {(log.old_data || log.new_data) ? 'click to expand' : ''}
                    </td>
                  </tr>

                  {/* Expanded diff row */}
                  {expanded === log.id && (log.old_data || log.new_data) && (
                    <tr key={`${log.id}-expand`} className="bg-surface-DEFAULT/40">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          {log.old_data && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Before</p>
                              <pre className="text-xs text-slate-400 bg-surface-card border border-surface-border rounded-lg p-3 overflow-auto max-h-48">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">After</p>
                              <pre className="text-xs text-emerald-400/80 bg-surface-card border border-surface-border rounded-lg p-3 overflow-auto max-h-48">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
