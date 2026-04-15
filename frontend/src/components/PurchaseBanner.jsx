import { createPortal } from 'react-dom'

const FEATURES = [
  'CSV Import / Export (unlimited rows)',
  'ARP Sweep Discovery via SSH',
  'Scheduled Tasks & Automation',
  'Database Backup & Restore',
  'Logs Download (ZIP)',
  'Multi-user Management (Add / Delete)',
  'Device Inventory (Gateways CRUD)',
  'Priority Support',
]

const EMAIL    = 'Ashuoffice09@gmail.com'
const LINKEDIN = 'https://www.linkedin.com/in/ashish-singh-865283141'

export function PurchaseBanner({ onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-violet-500/30 shadow-2xl"
        style={{ background: '#161b25' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🔒</span>
            <h2 className="text-lg font-semibold text-white">Full Version Feature</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            This feature is available in the <span className="text-violet-400 font-medium">IPMAX Full Version</span>.
          </p>
        </div>

        {/* Features list */}
        <div className="px-7 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Full Version Includes
          </p>
          <ul className="space-y-2">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-emerald-400 text-base leading-none">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info */}
        <div className="px-7 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Get in Touch
          </p>
          <div className="space-y-2">
            {/* Email */}
            <a href={`mailto:${EMAIL}?subject=IPMAX%20Full%20Version%20Enquiry`}
               className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition group">
              <span className="text-lg">📧</span>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-300 group-hover:text-violet-400 transition">{EMAIL}</p>
              </div>
            </a>
            {/* LinkedIn */}
            <a href={LINKEDIN}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition group">
              <span className="text-lg">💼</span>
              <div>
                <p className="text-xs text-slate-500">LinkedIn</p>
                <p className="text-sm text-slate-300 group-hover:text-blue-400 transition">Ashish Singh</p>
              </div>
            </a>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="px-7 pb-7 pt-2 flex items-center gap-3">
          <a
            href={`mailto:${EMAIL}?subject=IPMAX%20Full%20Version%20Enquiry`}
            className="flex-1 text-center py-2.5 rounded-lg font-semibold text-sm text-white transition"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
          >
            📧 Email Us
          </a>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm text-slate-300 border border-white/10 hover:bg-white/5 transition"
          >
            Close
          </button>
        </div>

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition text-lg leading-none"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  )
}
