import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Key, Users as UsersIcon, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, ConfirmDialog, Spinner, EmptyState } from '../components/UI'
import { PurchaseBanner } from '../components/PurchaseBanner'
import { auth } from '../api/client'

const ROLE_STYLES = {
  admin:  'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  editor: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  viewer: 'bg-slate-500/10 text-slate-400 border border-slate-500/30',
}
const ROLE_DESC = {
  admin:  'Full access + user management',
  editor: 'Add/edit/delete subnets & IPs',
  viewer: 'Read-only access',
}

export function Users() {
  const token   = auth.getToken()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(null)
  const [resetting, setResetting] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [showPurchase, setPurchase] = useState(false)

  const [editForm, setEditForm]   = useState({ email: '', role: 'viewer', is_active: true })
  const [resetForm, setResetForm] = useState({ new_password: '', confirm: '' })

  const load = () => {
    fetch('/api/users/', { headers }).then(r => r.json()).then(setUsers).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${editing.id}`, { method: 'PATCH', headers, body: JSON.stringify(editForm) })
      if (!res.ok) throw new Error('Failed to update')
      toast.success('User updated'); setEditing(null); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleResetPassword = async () => {
    if (resetForm.new_password.length < 8) { toast.error('Min 8 characters'); return }
    if (resetForm.new_password !== resetForm.confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${resetting.id}/reset-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ new_password: resetForm.new_password })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Password reset for ${resetting.username}`)
      setResetting(null); setResetForm({ new_password: '', confirm: '' })
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const ef = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const rf = (k) => (e) => setResetForm(p => ({ ...p, [k]: e.target.value }))

  if (loading) return <Spinner />

  return (
    <div className="animate-fade-in">
      {showPurchase && <PurchaseBanner onClose={() => setPurchase(false)} />}

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Add User — locked */}
        <button onClick={() => setPurchase(true)} className="btn-primary">
          <Lock size={14} className="text-violet-200" /> Add User
        </button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(ROLE_DESC).map(([role, desc]) => (
          <div key={role} className="card p-4">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mb-1 ${ROLE_STYLES[role]}`}>{role}</span>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Add the first user" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Username', 'Email', 'Role', 'Status', 'Last Login', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-surface-border last:border-0 hover:bg-surface-hover transition-colors group ${i % 2 === 0 ? '' : 'bg-surface-DEFAULT/30'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                           style={{ backgroundColor: '#17b584' }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-slate-200 font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ROLE_STYLES[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border
                      ${u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Edit — open */}
                      <button onClick={() => { setEditing(u); setEditForm({ email: u.email, role: u.role, is_active: u.is_active }) }}
                              className="p-1.5 rounded-lg hover:bg-surface-border text-slate-400 hover:text-white transition-colors" title="Edit user">
                        <Pencil size={13} />
                      </button>
                      {/* Reset password — open */}
                      <button onClick={() => { setResetting(u); setResetForm({ new_password: '', confirm: '' }) }}
                              className="p-1.5 rounded-lg hover:bg-surface-border text-slate-400 hover:text-amber-400 transition-colors" title="Reset password">
                        <Key size={13} />
                      </button>
                      {/* Delete — locked */}
                      <button onClick={() => setPurchase(true)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 transition-colors" title="Delete user (Full Version)">
                        <Lock size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal — open */}
      {editing && (
        <Modal title={`Edit — ${editing.username}`} onClose={() => setEditing(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={editForm.email} onChange={ef('email')} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={editForm.role} onChange={ef('role')}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={editForm.is_active} onChange={ef('is_active')}
                     className="w-4 h-4 rounded" />
              <label htmlFor="is_active" className="text-sm text-slate-300 cursor-pointer">Active</label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal — open */}
      {resetting && (
        <Modal title={`Reset Password — ${resetting.username}`} onClose={() => setResetting(null)} size="sm">
          <div className="space-y-4">
            <div className="rounded-lg px-4 py-3 text-xs text-amber-400"
                 style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              You are resetting the password for <strong>{resetting.username}</strong>. Share the new password securely.
            </div>
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" value={resetForm.new_password} onChange={rf('new_password')} placeholder="min 8 characters" />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type="password" value={resetForm.confirm} onChange={rf('confirm')} placeholder="repeat password" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setResetting(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleResetPassword} disabled={saving} className="btn-primary">
                {saving ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
