import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Network, Globe, Shield, Upload, Users, LogOut, Activity, Server, Calendar, LifeBuoy } from 'lucide-react'
import { auth } from '../api/client'

export function Sidebar({ user, onLogout }) {
  const navItems = [
    { to: '/',        icon: LayoutDashboard, label: 'Dashboard',        show: true },
    { to: '/subnets', icon: Network,         label: 'Subnets',          show: true },
    { to: '/ips',     icon: Globe,           label: 'IP Addresses',     show: true },
    { to: '/audit',   icon: Shield,          label: 'Audit Log',        show: true },
    { to: '/import',  icon: Upload,          label: 'Import/Export',    show: true },
    { to: '/activity',icon: Activity,        label: 'Activity Log',     show: true },
    { to: '/devices',   icon: Server,          label: 'Device Inventory', show: user?.role === 'admin' },
    { to: '/schedules', icon: Calendar,         label: 'Tasks',            show: user?.role === 'admin' },
    { to: '/support',   icon: LifeBuoy,         label: 'Support',          show: user?.role === 'admin' },
    { to: '/users',     icon: Users,            label: 'Users',            show: user?.role === 'admin' },
  ]

  const ROLE_COLOR = { admin: '#a78bfa', editor: '#60a5fa', viewer: '#94a3b8' }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r flex flex-col z-40"
           style={{ backgroundColor: '#161b25', borderColor: '#1e2736' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#1e2736' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#17b584' }}>
            <Globe size={14} className="text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm leading-none">IPMAX</p>
            <p className="text-xs text-slate-500 mt-0.5">Address Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-xs text-slate-600 uppercase tracking-widest font-medium px-3 mb-2 mt-1">Menu</p>
        {navItems.filter(n => n.show).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: 'rgba(23,181,132,0.12)' } : {}}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t space-y-1" style={{ borderColor: '#1e2736' }}>
        {user && (
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                   style={{ backgroundColor: '#17b584' }}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{user.username}</p>
                <p className="text-xs font-medium" style={{ color: ROLE_COLOR[user.role] || '#94a3b8' }}>{user.role}</p>
              </div>
            </div>
          </div>
        )}
        <button onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 transition-colors">
          <LogOut size={13} /> Sign out
        </button>
        <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#17b584' }} />
          v0.3.0 — Phase 3
        </div>
      </div>
    </aside>
  )
}
