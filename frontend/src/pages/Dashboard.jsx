import { useEffect, useState } from 'react'
import { Network, Globe, CheckCircle2, Lock, Clock, TrendingUp, MapPin } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import { Spinner } from '../components/UI'

const COLORS = {
  used:       '#17b584',
  free:       '#3b82f6',
  reserved:   '#f59e0b',
  deprecated: '#64748b',
}

// Utilization color
function utilColor(pct) {
  if (pct >= 90) return '#ef4444'   // red
  if (pct >= 75) return '#f59e0b'   // amber
  if (pct >= 50) return '#17b584'   // green
  return '#3b82f6'                   // blue
}

export function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [subnets, setSubnets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.get('/dashboard/subnets'),
    ]).then(([s, sn]) => {
      setStats(s)
      setSubnets(sn)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!stats)  return <p className="text-slate-500 p-8">Could not load stats.</p>

  const pieData = [
    { name: 'Used',       value: stats.used_ips },
    { name: 'Free',       value: stats.free_ips },
    { name: 'Reserved',   value: stats.reserved_ips },
    { name: 'Deprecated', value: stats.deprecated_ips },
  ].filter(d => d.value > 0)

  const statCards = [
    { label: 'Total Subnets', value: stats.total_subnets,  icon: Network,      color: '#17b584' },
    { label: 'Total IPs',     value: stats.total_ips,      icon: Globe,        color: '#60a5fa' },
    { label: 'Used',          value: stats.used_ips,       icon: CheckCircle2, color: '#17b584' },
    { label: 'Free',          value: stats.free_ips,       icon: TrendingUp,   color: '#60a5fa' },
    { label: 'Reserved',      value: stats.reserved_ips,   icon: Lock,         color: '#f59e0b' },
    { label: 'Deprecated',    value: stats.deprecated_ips, icon: Clock,        color: '#64748b' },
  ]

  // Top 5 most utilized subnets
  const topSubnets = subnets.slice(0, 5)

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Network IP address overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-display font-semibold text-white">{value}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Utilization + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Overall utilization bar */}
        <div className="card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Overall Utilization</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="font-display text-4xl font-semibold text-white">{stats.utilization_pct}%</span>
            <span className="text-sm text-slate-500 mb-1">of total IPs in use</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e2736' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${stats.utilization_pct}%`,
                          backgroundColor: utilColor(stats.utilization_pct) }} />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1.5">
            <span>0%</span><span>100%</span>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Status Breakdown</p>
          {stats.total_ips > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                       dataKey="value" stroke="none">
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b25', border: '1px solid #1e2736',
                                    borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {pieData.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full"
                           style={{ background: COLORS[entry.name.toLowerCase()] }} />
                      <span className="text-slate-400">{entry.name}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-300">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No IP data yet</p>
          )}
        </div>
      </div>

      {/* Subnet Utilization Bars */}
      {subnets.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Subnet Utilization — Top {topSubnets.length}
            </p>
            <span className="text-xs text-slate-600">{subnets.length} total subnets</span>
          </div>

          <div className="space-y-4">
            {topSubnets.map(s => (
              <div key={s.id}>
                {/* Subnet name + meta */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-white font-medium truncate">{s.name}</span>
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      {s.network}/{s.cidr}
                    </span>
                    {s.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-600 shrink-0">
                        <MapPin size={10} />
                        {s.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-slate-500">
                      {s.used + s.used_dhcp}/{s.capacity}
                    </span>
                    <span className="text-xs font-semibold w-10 text-right"
                          style={{ color: utilColor(s.utilization) }}>
                      {s.utilization}%
                    </span>
                  </div>
                </div>

                {/* Progress bar — segmented */}
                <div className="h-2 rounded-full overflow-hidden flex gap-px"
                     style={{ backgroundColor: '#1e2736' }}>
                  {/* Used */}
                  {s.used > 0 && (
                    <div className="h-full transition-all duration-500"
                         style={{ width: `${(s.used / s.capacity) * 100}%`,
                                  backgroundColor: '#17b584' }} />
                  )}
                  {/* Used-DHCP */}
                  {s.used_dhcp > 0 && (
                    <div className="h-full transition-all duration-500"
                         style={{ width: `${(s.used_dhcp / s.capacity) * 100}%`,
                                  backgroundColor: '#34d399' }} />
                  )}
                  {/* Reserved */}
                  {s.reserved > 0 && (
                    <div className="h-full transition-all duration-500"
                         style={{ width: `${(s.reserved / s.capacity) * 100}%`,
                                  backgroundColor: '#f59e0b' }} />
                  )}
                  {/* Deprecated */}
                  {s.deprecated > 0 && (
                    <div className="h-full transition-all duration-500"
                         style={{ width: `${(s.deprecated / s.capacity) * 100}%`,
                                  backgroundColor: '#475569' }} />
                  )}
                </div>

                {/* Mini legend */}
                <div className="flex gap-3 mt-1">
                  {s.used > 0 && (
                    <span className="text-xs" style={{ color: '#17b584' }}>
                      {s.used} used
                    </span>
                  )}
                  {s.used_dhcp > 0 && (
                    <span className="text-xs" style={{ color: '#34d399' }}>
                      {s.used_dhcp} dhcp
                    </span>
                  )}
                  {s.reserved > 0 && (
                    <span className="text-xs" style={{ color: '#f59e0b' }}>
                      {s.reserved} reserved
                    </span>
                  )}
                  {s.free > 0 && (
                    <span className="text-xs text-slate-600">
                      {s.free} free
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
