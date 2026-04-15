import { X, AlertTriangle, Lock } from 'lucide-react'
import { createPortal } from 'react-dom'
import { auth } from '../api/client'

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border status-${status}`}>
      {status}
    </span>
  )
}

export function Modal({ title, onClose, children, size = 'md' }) {
  const maxWidths = { sm: '400px', md: '520px', lg: '720px' }
  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', zIndex: 9999
    }}>
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9998
      }} />
      <div className="card animate-fade-in" style={{
        position: 'relative', width: '100%', maxWidth: maxWidths[size],
        maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem',
        zIndex: 9999, boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{title}</h2>
          <button onClick={onClose} style={{
            padding: '6px', borderRadius: '8px', background: 'transparent',
            border: 'none', cursor: 'pointer', color: '#94a3b8', flexShrink: 0
          }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', zIndex: 9999
    }}>
      <div onClick={onCancel} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998
      }} />
      <div className="card animate-fade-in" style={{
        position: 'relative', width: '100%', maxWidth: '400px',
        padding: '1.5rem', zIndex: 9999, boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ padding: '8px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '8px', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: '#f87171' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 500, color: 'white', marginBottom: '4px' }}>Confirm Delete</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 16px', backgroundColor: '#ef4444', color: 'white',
            fontSize: '14px', fontWeight: 500, borderRadius: '8px',
            border: 'none', cursor: 'pointer'
          }}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
           style={{ borderColor: '#17b584', borderTopColor: 'transparent' }} />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: '#1a2133' }}>
        <Icon size={28} className="text-slate-500" />
      </div>
      <p className="font-medium text-slate-300 mb-1">{title}</p>
      <p className="text-sm text-slate-500 mb-5">{description}</p>
      {action}
    </div>
  )
}

export function Can({ role, children, fallback = null }) {
  const user = auth.getUser()
  if (!user) return fallback
  const hierarchy = { admin: 3, editor: 2, viewer: 1 }
  const required  = hierarchy[role] || 1
  const current   = hierarchy[user.role] || 0
  return current >= required ? children : fallback
}

export function ViewerNotice() {
  const user = auth.getUser()
  if (!user || user.role !== 'viewer') return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                  borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#94a3b8',
                  backgroundColor: '#1a2133', border: '1px solid #1e2736' }}>
      <Lock size={12} style={{ color: '#64748b' }} />
      You have read-only access. Contact an admin to make changes.
    </div>
  )
}
