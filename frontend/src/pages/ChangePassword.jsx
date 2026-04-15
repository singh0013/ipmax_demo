import { useState } from 'react'
import { Key, Globe } from 'lucide-react'
import { auth } from '../api/client'
import toast from 'react-hot-toast'

export function ChangePasswordModal({ onDone }) {
  const [form, setForm]     = useState({ current_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    if (form.new_password.length < 8) { setError('Min 8 characters'); return }
    if (form.new_password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.new_password === 'Admin@123') { setError('Please choose a different password'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      toast.success('Password changed!')
      onDone()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-sm card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
            <Key size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white">Change Password</h2>
            <p className="text-xs text-slate-500">Please set a new password before continuing</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg px-4 py-3 mb-4 text-sm text-red-400"
               style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input className="input" type="password" value={form.current_password} onChange={f('current_password')} placeholder="Admin@123" autoFocus />
          </div>
          <div>
            <label className="label">New Password</label>
            <input className="input" type="password" value={form.new_password} onChange={f('new_password')} placeholder="min 8 characters" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input className="input" type="password" value={form.confirm} onChange={f('confirm')} placeholder="repeat new password" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onDone} className="btn-secondary flex-1 justify-center">
              Skip for now
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
