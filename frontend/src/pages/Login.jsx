import { useState } from 'react'
import { Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export function Login({ onLogin }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Username and password required'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      onLogin(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f1117' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#17b584' }}>
            <Globe size={18} className="text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-white text-lg leading-none">IPMAX</p>
            <p className="text-xs text-slate-500">IP Address Manager</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h1 className="font-display text-xl font-semibold text-white mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="rounded-lg px-4 py-3 mb-4 text-sm text-red-400"
                 style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" autoFocus placeholder="admin"
                     value={form.username}
                     onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                     value={form.password}
                     onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading}
                    className="btn-primary w-full justify-center py-2.5 mt-2"
                    style={{ fontSize: '14px' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Default: admin / Admin@123
        </p>
      </div>
    </div>
  )
}
