import { useState, useEffect, useRef } from 'react'
import { PurchaseBanner } from '../components/PurchaseBanner'
import { createPortal } from 'react-dom'
import { Radar, CheckCircle2, XCircle, Minus, StopCircle, Zap, Search } from 'lucide-react'
import { auth, api } from '../api/client'
import { useNavigate } from 'react-router-dom'

const PORT_NAMES = {
  22: 'SSH', 23: 'Telnet', 80: 'HTTP', 443: 'HTTPS',
  3389: 'RDP', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
  161: 'SNMP', 445: 'SMB', 21: 'FTP'
}

// Global discovery state - persists across page navigation
let globalJob = null
let globalListeners = []
function notifyListeners() { globalListeners.forEach(fn => fn(globalJob)) }
function subscribeJob(fn) {
  globalListeners.push(fn)
  return () => { globalListeners = globalListeners.filter(f => f !== fn) }
}

// Start polling in background - survives page navigation
let pollingTimer = null
function startPolling(jobId, token) {
  if (pollingTimer) return
  pollingTimer = setInterval(async () => {
    try {
      const res  = await fetch(`/api/discovery/status/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      globalJob  = data
      notifyListeners()
      if (data.status === 'completed' || data.status === 'error') {
        clearInterval(pollingTimer); pollingTimer = null
      }
    } catch (e) {}
  }, 2000)
}

export function useDiscoveryJob() {
  const [job, setJob] = useState(globalJob)
  useEffect(() => subscribeJob(setJob), [])
  return job
}

export function DiscoveryModal({ subnetIds, subnetNames, onClose }) {
  const [phase, setPhase]         = useState('config')
  const [method, setMethod]       = useState('tcp')      // 'tcp' | 'arp'
  const [timeout_, setTimeout_]   = useState(1.0)
  const [gateways, setGateways]   = useState([])
  const [selectedGw, setSelectedGw] = useState('')      // gateway id for ARP
  const [error, setError]         = useState('')
  const [minimized, setMin]       = useState(false)
  const [job, setJob]             = useState(globalJob)
  const [showPurchase, setPurchase] = useState(false)
  const navigate                  = useNavigate()
  const token                     = auth.getToken()
  const headers                   = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => subscribeJob(setJob), [])

  // If there's already a running job, show it
  useEffect(() => {
    if (globalJob && (globalJob.status === 'running' || globalJob.status === 'completed')) {
      setPhase(globalJob.status === 'running' ? 'running' : 'done')
    }
  }, [])

  // Load gateways when ARP method selected
  useEffect(() => {
    if (method === 'arp') {
      api.get('/gateways')
        .then(gws => {
          const active = gws.filter(g => g.is_active)
          setGateways(active)
          if (active.length === 1) setSelectedGw(String(active[0].id))
        })
        .catch(() => setGateways([]))
    }
  }, [method])

  // ── TCP Probe scan ───────────────────────────────────────────
  const startTcpScan = async () => {
    setError('')
    try {
      const res  = await fetch('/api/discovery/scan', {
        method: 'POST', headers,
        body: JSON.stringify({
          subnet_ids: subnetIds,
          timeout:    timeout_,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to start')
      globalJob = { id: data.job_id, status: 'running', total: 0, processed: 0,
                    succeeded: 0, failed: 0, logs: [], summary: 'Starting TCP scan...' }
      notifyListeners()
      setJob(globalJob)
      setPhase('running')
      startPolling(data.job_id, token)
    } catch (e) { setError(e.message) }
  }

  // ── ARP Sweep ────────────────────────────────────────────────
  const startArpSweep = async () => {
    if (!selectedGw) { setError('Please select a gateway device'); return }
    setError('')

    try {
      const res = await fetch('/api/discovery/arp-sweep', {
        method: 'POST', headers,
        body: JSON.stringify({
          gateway_id: parseInt(selectedGw),
          subnet_ids: subnetIds,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to start ARP sweep')

      globalJob = { id: data.job_id, status: 'running', total: 0, processed: 0,
                    succeeded: 0, failed: 0, logs: [], summary: 'ARP sweep in progress...' }
      notifyListeners()
      setJob(globalJob)
      setPhase('running')
      startPolling(data.job_id, token)
    } catch (e) {
      setError(e.message)
    }
  }

  const startScan = () => method === 'arp' ? startArpSweep() : startTcpScan()

  const stopScan = async () => {
    if (!job?.id) return
    try {
      if (job.id) {
        await fetch(`/api/discovery/stop/${job.id}`, { method: 'POST', headers })
      }
    } catch (e) {}
    globalJob = { ...globalJob, status: 'error', summary: 'Stopped by user' }
    notifyListeners()
    clearInterval(pollingTimer); pollingTimer = null
    setPhase('done')
  }

  const pct = job?.total > 0 ? Math.round((job.processed / job.total) * 100) : 0

  // Minimized pill
  if (minimized) {
    return (
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderRadius: '50px',
        backgroundColor: '#161b25', border: '1px solid rgba(23,181,132,0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', cursor: 'pointer'
      }} onClick={() => setMin(false)}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: job?.status === 'running' ? '#f59e0b' : '#17b584',
                      animation: job?.status === 'running' ? 'pulse 1s infinite' : 'none' }} />
        <Radar size={14} style={{ color: '#17b584' }} />
        <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
          {job?.status === 'running' ? `Scanning… ${pct}%` : `Discovery ${job?.status}`}
        </span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{job?.succeeded ?? 0} alive</span>
      </div>
    )
  }

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', zIndex: 9999
    }}>
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}
      <div onClick={phase === 'config' ? onClose : () => setMin(true)}
           style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)', zIndex: 9998 }} />
      <div className="card animate-fade-in" style={{
        position: 'relative', zIndex: 9999, width: '100%', maxWidth: '580px',
        padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(23,181,132,0.1)' }}>
              <Radar size={18} style={{ color: '#17b584' }} />
            </div>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>
                Network Discovery
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                {subnetNames?.join(', ') || (job?.summary || '')}
              </p>
            </div>
          </div>
          {phase !== 'config' && (
            <button onClick={() => setMin(true)}
                    title="Minimize — scan continues in background"
                    style={{ padding: '6px', borderRadius: '8px', background: 'transparent',
                             border: '1px solid #1e2736', cursor: 'pointer', color: '#94a3b8' }}>
              <Minus size={14} />
            </button>
          )}
        </div>

        {/* ── Config Phase ── */}
        {phase === 'config' && (
          <div>
            {/* Subnet info */}
            <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                          backgroundColor: 'rgba(23,181,132,0.06)', border: '1px solid rgba(23,181,132,0.15)' }}>
              <p style={{ fontSize: '12px', color: '#34d399' }}>
                <strong>{subnetIds.length} subnet(s)</strong> selected for discovery.
              </p>
            </div>

            {/* ── Method Selector ── */}
            <div style={{ marginBottom: '16px' }}>
              <p className="label" style={{ marginBottom: '8px' }}>Discovery Method</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

                {/* ARP Sweep — locked in demo */}
                <button onClick={() => setPurchase(true)}
                        style={{
                          padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: `1px solid ${method === 'arp' ? 'rgba(23,181,132,0.5)' : '#1e2736'}`,
                          backgroundColor: method === 'arp' ? 'rgba(23,181,132,0.08)' : '#0f1117',
                          transition: 'all 0.15s',
                        }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Zap size={14} style={{ color: '#17b584' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>ARP Sweep</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                   backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>🔒 Full Version</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    SSH into gateway → fetch ARP table<br />
                    ~5 sec for entire subnet
                  </p>
                </button>

                {/* TCP Probe */}
                <button onClick={() => setMethod('tcp')}
                        style={{
                          padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: `1px solid ${method === 'tcp' ? 'rgba(96,165,250,0.5)' : '#1e2736'}`,
                          backgroundColor: method === 'tcp' ? 'rgba(96,165,250,0.08)' : '#0f1117',
                          transition: 'all 0.15s',
                        }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Search size={14} style={{ color: '#60a5fa' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>TCP Probe</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                   backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>Standard</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    Direct port scan on each IP<br />
                    Works without gateway device
                  </p>
                </button>
              </div>
            </div>

            {/* ── ARP Sweep Options ── */}
            {method === 'arp' && (
              <div style={{ padding: '14px 16px', borderRadius: '10px', marginBottom: '16px',
                            backgroundColor: '#0f1117', border: '1px solid #1e2736' }}>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '10px' }}>
                  Select Gateway Device
                </p>
                {gateways.length === 0 ? (
                  <div style={{ padding: '10px', borderRadius: '8px', textAlign: 'center',
                                backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>
                      No active gateway devices found
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>
                      Add devices in Device Inventory first
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {gateways.map(gw => (
                      <label key={gw.id}
                             style={{
                               display: 'flex', alignItems: 'center', gap: '10px',
                               padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                               border: `1px solid ${selectedGw === String(gw.id) ? 'rgba(23,181,132,0.4)' : '#1e2736'}`,
                               backgroundColor: selectedGw === String(gw.id) ? 'rgba(23,181,132,0.06)' : 'transparent',
                             }}>
                        <input type="radio" name="gateway"
                               value={String(gw.id)}
                               checked={selectedGw === String(gw.id)}
                               onChange={e => setSelectedGw(e.target.value)}
                               style={{ accentColor: '#17b584' }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
                            {gw.name || gw.ip_address}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                            {gw.ip_address}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                       backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
                                       textTransform: 'capitalize' }}>
                          {gw.vendor}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TCP Probe Options ── */}
            {method === 'tcp' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label className="label">Probe Timeout (seconds per IP)</label>
                  <select className="input" value={timeout_}
                          onChange={e => setTimeout_(parseFloat(e.target.value))}>
                    <option value={0.5}>0.5s — Fast (local network)</option>
                    <option value={1.0}>1.0s — Normal (recommended)</option>
                    <option value={2.0}>2.0s — Slow (remote/WAN)</option>
                  </select>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                              backgroundColor: '#0f1117', border: '1px solid #1e2736',
                              fontSize: '12px', color: '#64748b' }}>
                  Ports probed: SSH(22), Telnet(23), FTP(21), HTTP(80), HTTPS(443),
                  RDP(3389), SMB(445), HTTP-Alt(8080)
                </div>
              </>
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            fontSize: '13px', color: '#f87171' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={startScan}
                      disabled={method === 'arp' && gateways.length === 0}
                      className="btn-primary"
                      style={{ opacity: method === 'arp' && gateways.length === 0 ? 0.5 : 1 }}>
                {method === 'arp'
                  ? <><Zap size={14} /> Start ARP Sweep</>
                  : <><Radar size={14} /> Start Discovery</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Running / Done Phase ── */}
        {(phase === 'running' || phase === 'done') && (
          <div>
            {/* Progress bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {phase === 'running' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                                  backgroundColor: '#f59e0b', animation: 'pulse 1s infinite' }} />
                  )}
                  {phase === 'done'
                    ? (job?.status === 'error' ? '⚠ Stopped / Error' : '✅ Complete')
                    : `Scanning… ${job?.processed ?? 0}/${job?.total ?? 0} IPs`}
                </span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#1e2736', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`,
                              transition: 'width 0.5s ease',
                              backgroundColor: job?.status === 'error' ? '#ef4444' : '#17b584' }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Scanned',     value: job?.processed ?? 0, color: '#e2e8f0' },
                { label: 'Alive',       value: job?.succeeded  ?? 0, color: '#34d399' },
                { label: 'No Response', value: job?.failed     ?? 0, color: '#64748b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px', borderRadius: '8px',
                                          backgroundColor: '#0f1117', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 600, color }}>{value}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            {job?.summary && (
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px',
                          padding: '8px 12px', backgroundColor: '#0f1117', borderRadius: '6px' }}>
                {job.summary}
              </p>
            )}

            {/* Live logs */}
            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e2736', marginBottom: '16px' }}>
              <div style={{ padding: '6px 12px', backgroundColor: '#0f1117', fontSize: '11px',
                            color: '#64748b', borderBottom: '1px solid #1e2736',
                            display: 'flex', justifyContent: 'space-between' }}>
                <span>{phase === 'running' ? '● LIVE' : 'RESULTS'} — {(job?.logs || []).length} entries</span>
                {phase === 'running' && (
                  <span style={{ color: '#f59e0b' }}>auto-updating every 2s</span>
                )}
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {(job?.logs || []).length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                    Waiting for results…
                  </div>
                ) : (
                  [...(job?.logs || [])].reverse().map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                          padding: '5px 12px', borderBottom: '1px solid #0f1117',
                                          fontSize: '12px' }}>
                      <CheckCircle2 size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace', color: '#e2e8f0',
                                     minWidth: '115px', flexShrink: 0 }}>{entry.ip}</span>
                      {entry.hostname && (
                        <span style={{ color: '#94a3b8', flexShrink: 0, fontSize: '11px' }}>
                          {entry.hostname}
                        </span>
                      )}
                      {entry.mac && (
                        <span style={{ color: '#818cf8', fontSize: '11px', fontFamily: 'monospace' }}>
                          {entry.mac}
                        </span>
                      )}
                      {entry.ports?.length > 0 && (
                        <span style={{ color: '#60a5fa', fontSize: '11px' }}>
                          {entry.ports.map(p => PORT_NAMES[p] || p).join(', ')}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {phase === 'running' && (
                <button onClick={stopScan}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px',
                                 padding: '8px 16px', borderRadius: '8px',
                                 backgroundColor: 'rgba(239,68,68,0.1)',
                                 border: '1px solid rgba(239,68,68,0.3)',
                                 color: '#f87171', fontSize: '13px', cursor: 'pointer' }}>
                  <StopCircle size={14} /> Stop Scan
                </button>
              )}
              {phase === 'done' && (
                <button onClick={() => { onClose(); navigate('/activity') }} className="btn-primary">
                  View Activity Log
                </button>
              )}
              {phase === 'done' && (
                <button onClick={onClose} className="btn-secondary">Close</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Floating pill ────────────────────────────────────────────────
export function DiscoveryPill() {
  const job      = useDiscoveryJob()
  const [vis, setVis] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setVis(job?.status === 'running' || job?.status === 'completed')
  }, [job])

  if (!vis || !job) return null
  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 8000,
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 18px', borderRadius: '50px',
      backgroundColor: '#161b25',
      border: `1px solid ${job.status === 'running' ? 'rgba(245,158,11,0.4)' : 'rgba(23,181,132,0.4)'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', cursor: 'pointer'
    }} onClick={() => navigate('/activity')}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: job.status === 'running' ? '#f59e0b' : '#17b584',
                    animation: job.status === 'running' ? 'pulse 1s infinite' : 'none' }} />
      <Radar size={14} style={{ color: job.status === 'running' ? '#f59e0b' : '#17b584' }} />
      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
        {job.status === 'running' ? `Scanning… ${pct}%` : `Discovery complete`}
      </span>
      <span style={{ fontSize: '11px', color: '#64748b' }}>{job.succeeded ?? 0} alive</span>
    </div>
  )
}
