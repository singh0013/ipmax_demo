import { useState, useEffect, useRef } from 'react'
import { Upload, Download, AlertTriangle, FileText, CheckCircle2, XCircle, Info, Lock } from 'lucide-react'
import { api, auth } from '../api/client'
import { PurchaseBanner } from '../components/PurchaseBanner'
import toast from 'react-hot-toast'

function DropZone({ file, onFile, onLock }) {
  const [dragging, setDragging] = useState(false)
  const handleFile = (f) => {
    if (onLock) { onLock(); return }
    f?.name.endsWith('.csv') ? onFile(f) : toast.error('Please select a .csv file')
  }
  return (
    <div onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
         onDragOver={e => { e.preventDefault(); setDragging(true) }}
         onDragLeave={() => setDragging(false)}
         onClick={() => onLock ? onLock() : document.getElementById('csv-input').click()}
         className="border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors"
         style={{ borderColor: dragging ? '#17b584' : '#1e2736', backgroundColor: dragging ? 'rgba(23,181,132,0.04)' : '' }}>
      <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText size={20} className="text-emerald-400" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB — click to change</p>
          </div>
        </div>
      ) : (
        <>
          {onLock
            ? <Lock size={22} className="mx-auto text-slate-500 mb-2" />
            : <Upload size={22} className="mx-auto text-slate-500 mb-2" />}
          <p className="text-sm text-slate-400">
            {onLock
              ? <span style={{ color: '#a78bfa' }}>🔒 Full Version feature — click to learn more</span>
              : <>Drop CSV here or <span style={{ color: '#17b584' }}>browse</span></>}
          </p>
        </>
      )}
    </div>
  )
}

function ProgressIndicator({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(t)
  }, [startTime])
  return (
    <div className="mt-4 animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#0f1117', border: '1px solid #1e2736' }}>
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: '#17b584', borderTopColor: 'transparent' }} />
        <div className="flex-1">
          <p className="text-sm text-slate-300">Processing…</p>
          <p className="text-xs text-slate-500 mt-0.5">Running for {elapsed}s — check Activity Log for details</p>
        </div>
        <span className="text-xs text-slate-600">{elapsed}s</span>
      </div>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1e2736' }}>
        <div className="h-full rounded-full animate-pulse" style={{ backgroundColor: '#17b584', width: '60%' }} />
      </div>
    </div>
  )
}

function ResultBox({ result, type }) {
  if (!result) return null
  const allGood = result.skipped === 0 && result.errors.length === 0
  return (
    <div className="card p-5 mt-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        {allGood
          ? <CheckCircle2 size={16} className="text-emerald-400" />
          : <AlertTriangle size={16} className="text-amber-400" />}
        <p className="text-sm font-medium text-white">Import Complete</p>
      </div>
      <div className={`grid gap-3 mb-4 ${result.updated > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {[
          { label: 'Total rows',  value: result.total,    color: 'text-white' },
          { label: 'Created',     value: result.imported - (result.updated || 0), color: 'text-emerald-400' },
          ...(result.updated > 0 ? [{ label: 'Updated', value: result.updated, color: 'text-blue-400' }] : []),
          { label: 'Skipped',     value: result.skipped,  color: result.skipped > 0 ? 'text-amber-400' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-3 text-center" style={{ backgroundColor: '#0f1117' }}>
            <p className={`text-2xl font-display font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && (
        <>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Warnings / Skipped rows</p>
          <div className="rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5" style={{ backgroundColor: '#0f1117' }}>
            {result.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-400/80">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />{e}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ImportPage() {
  const [subnets, setSubnets]       = useState([])
  const [tab, setTab]               = useState('ip')
  const [subnetId, setSubnetId]     = useState('auto')
  const [importMode, setImportMode] = useState('insert')
  const [ipFile, setIpFile]         = useState(null)
  const [subnetFile, setSubnetFile] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [startTime, setStartTime]   = useState(null)
  const [result, setResult]         = useState(null)
  const [showPurchase, setPurchase] = useState(false)

  useEffect(() => {
    api.getSubnets().then(setSubnets)
  }, [])

  const lock = () => setPurchase(true)

  const TAB = (active) => ({
    padding: '6px 16px', borderRadius: '8px', fontSize: '13px',
    fontWeight: active ? '500' : '400', cursor: 'pointer', border: 'none',
    backgroundColor: active ? '#17b584' : 'transparent',
    color: active ? 'white' : '#94a3b8', transition: 'all 0.15s',
  })

  return (
    <div className="animate-fade-in max-w-2xl">
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}

      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-white">Import / Export</h1>
        <p className="text-sm text-slate-500 mt-1">Bulk import via CSV or export existing data</p>
      </div>

      {/* Export — all locked */}
      <div className="card p-5 mb-5">
        <p className="text-sm font-medium text-slate-300 mb-3">Export</p>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={lock}>
            <Lock size={13} className="text-violet-400" /> Export Subnets
          </button>
          <button className="btn-secondary" onClick={lock}>
            <Lock size={13} className="text-violet-400" /> Export All IPs
          </button>
          <button className="btn-secondary" onClick={() => window.open('/api/import/audit/export', '_blank')}>
            <Download size={13} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* Import — locked */}
      <div className="card p-5">
        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
          <button style={TAB(tab === 'ip')}     onClick={() => { setTab('ip');     setResult(null) }}>IP Addresses</button>
          <button style={TAB(tab === 'subnet')} onClick={() => { setTab('subnet'); setResult(null) }}>Subnets</button>
        </div>

        {/* Locked notice */}
        <div className="rounded-lg px-4 py-3 mb-4 flex gap-2.5 text-xs"
             style={{ backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <Lock size={13} className="text-violet-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-violet-400 font-medium">Full Version feature</span>
            <span className="text-slate-400 ml-1">— CSV import is available in the IPMAX Full Version.</span>
          </div>
        </div>

        {tab === 'ip' ? (
          <>
            <div className="mb-4">
              <label className="label">Target Subnet</label>
              <select className="input" value={subnetId} onChange={e => setSubnetId(e.target.value)}>
                <option value="auto">🔍 Auto-detect from IP address</option>
                {subnets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.network}/{s.cidr})</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="label">Import Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'insert', label: 'Insert only',     desc: 'Existing IPs skipped' },
                  { val: 'upsert', label: 'Insert + Update', desc: 'Existing IPs updated' },
                ].map(({ val, label, desc }) => (
                  <button key={val} onClick={() => setImportMode(val)}
                          className="text-left p-3 rounded-lg border transition-colors"
                          style={{
                            borderColor: importMode === val ? '#17b584' : '#1e2736',
                            backgroundColor: importMode === val ? 'rgba(23,181,132,0.08)' : '#0f1117',
                          }}>
                    <p className="text-sm font-medium" style={{ color: importMode === val ? '#17b584' : '#e2e8f0' }}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <DropZone file={ipFile} onFile={setIpFile} onLock={lock} />
            <div className="flex justify-between items-center mt-3">
              <button className="btn-secondary text-xs" onClick={lock}>
                <Lock size={12} className="text-violet-400" /> Sample CSV
              </button>
              <button onClick={lock} className="btn-primary px-8">
                Import IPs
              </button>
            </div>
          </>
        ) : (
          <>
            <DropZone file={subnetFile} onFile={setSubnetFile} onLock={lock} />
            <div className="flex justify-between items-center mt-3">
              <button className="btn-secondary text-xs" onClick={lock}>
                <Lock size={12} className="text-violet-400" /> Sample CSV
              </button>
              <button onClick={lock} className="btn-primary px-8">
                Import Subnets
              </button>
            </div>
          </>
        )}
      </div>

      <ResultBox result={result} type={tab} />
    </div>
  )
}
