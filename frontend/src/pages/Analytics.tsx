/**
 * Analytics Page — historical charts, zone tables, heatmap history
 */
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react'
import { crowdApi } from '@/api/client'
import { useCrowdStore } from '@/store/crowdStore'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

const RISK_FILL: Record<string, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs space-y-1">
      <p className="text-slate-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.name.includes('density') ? 2 : 0) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { selectedCamera } = useCrowdStore()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)

  useEffect(() => {
    setLoading(true)
    crowdApi.getHistory(selectedCamera, hours, 15)
      .then(r => {
        const data = r.data.data.map((d: any) => ({
          ...d,
          time: format(parseISO(d.timestamp), 'HH:mm'),
          density_pct: Math.round(d.density_score * 100),
        }))
        setHistory(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedCamera, hours])

  const summary = history.length
    ? {
        peak: Math.max(...history.map(d => d.people_count)),
        avg: Math.round(history.reduce((s, d) => s + d.people_count, 0) / history.length),
        avgDensity: (history.reduce((s, d) => s + d.density_score, 0) / history.length * 100).toFixed(1),
        criticals: history.filter(d => d.risk_level === 'critical').length,
      }
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Historical crowd data · {selectedCamera}</p>
        </div>
        <div className="flex gap-2">
          {[6, 24, 48, 168].map(h => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={clsx('btn-ghost text-xs py-1.5 px-3',
                h === hours && 'bg-brand-600/20 text-brand-300 border-brand-500/30')}
            >
              {h < 24 ? `${h}h` : `${h / 24}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Peak Count', value: summary.peak, color: 'text-risk-high' },
            { label: 'Avg Count', value: summary.avg, color: 'text-brand-300' },
            { label: 'Avg Density', value: `${summary.avgDensity}%`, color: 'text-risk-medium' },
            { label: 'Critical Events', value: summary.criticals, color: 'text-risk-critical' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              <p className={clsx('text-3xl font-bold font-mono mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* People count area chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-300" /> Crowd Count Over Time
        </h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6272f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6272f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} interval={Math.floor(history.length / 8)} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="people_count" name="People" stroke="#6272f1" fill="url(#countGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Density */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Density Score (%)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} interval={Math.floor(history.length / 6)} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={75} stroke="#f97316" strokeDasharray="4 2" label={{ value: 'High', fill: '#f97316', fontSize: 10 }} />
              <ReferenceLine y={55} stroke="#eab308" strokeDasharray="4 2" label={{ value: 'Med', fill: '#eab308', fontSize: 10 }} />
              <Line type="monotone" dataKey="density_pct" name="Density %" stroke="#8097f8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution bar */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Level Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{
              Low: history.filter(d => d.risk_level === 'low').length,
              Medium: history.filter(d => d.risk_level === 'medium').length,
              High: history.filter(d => d.risk_level === 'high').length,
              Critical: history.filter(d => d.risk_level === 'critical').length,
            }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Low" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Medium" fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="High" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone table */}
      <ZoneTable cameraId={selectedCamera} />
    </div>
  )
}

function ZoneTable({ cameraId }: { cameraId: string }) {
  const { frames } = useCrowdStore()
  const frame = frames[cameraId]
  if (!frame) return null

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
        <BarChart3 size={15} className="text-brand-300" />
        <h3 className="text-sm font-semibold text-white">Zone Occupancy (Live)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              {['Zone', 'Position', 'Count', 'Density', 'Risk Level', 'Fill Bar'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(frame.zone_data).map(([key, zone]: [string, any]) => (
              <tr key={key} className="border-b border-white/5 hover:bg-surface-700/30 transition-colors">
                <td className="px-4 py-2 font-mono text-slate-300">{key}</td>
                <td className="px-4 py-2 text-slate-500">R{zone.row}·C{zone.col}</td>
                <td className="px-4 py-2 font-mono text-white">{zone.count}</td>
                <td className="px-4 py-2 font-mono text-white">{(zone.density * 100).toFixed(1)}%</td>
                <td className="px-4 py-2">
                  <span className={clsx('risk-badge', `risk-${zone.risk}`)}>{zone.risk}</span>
                </td>
                <td className="px-4 py-2 w-32">
                  <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${zone.density * 100}%`, background: RISK_FILL[zone.risk] }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
