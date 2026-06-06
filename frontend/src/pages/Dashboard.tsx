/**
 * Dashboard — main live monitoring page
 */
import { useEffect, useState } from 'react'
import { Users, Activity, AlertTriangle, Zap, TrendingUp, Eye, ArrowUp, ArrowDown } from 'lucide-react'
import { useCrowdStore } from '@/store/crowdStore'
import { crowdApi, alertsApi } from '@/api/client'
import LiveFeed from '@/components/monitoring/LiveFeed'
import HeatmapViewer from '@/components/analytics/HeatmapViewer'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import clsx from 'clsx'

const RISK_COLORS: Record<string, string> = {
  low: 'text-risk-low', medium: 'text-risk-medium',
  high: 'text-risk-high', critical: 'text-risk-critical'
}

// Mini sparkline for each camera card
function Sparkline({ data }: { data: number[] }) {
  const pts = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={pts}>
        <Area type="monotone" dataKey="v" stroke="#6272f1" fill="rgba(98,114,241,0.15)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function Dashboard() {
  const { selectedCamera, frames, setAlerts } = useCrowdStore()
  const frame = frames[selectedCamera]
  const [summary, setSummary] = useState<any>(null)
  const [mini, setMini] = useState<number[]>([])

  // Load summary
  useEffect(() => {
    crowdApi.getSummary().then(r => setSummary(r.data)).catch(() => {})
    alertsApi.list({ limit: 50 }).then(r => setAlerts(r.data.alerts)).catch(() => {})
  }, [])

  // Build sparkline from frame history
  useEffect(() => {
    if (frame) {
      setMini(prev => [...prev.slice(-19), frame.people_count])
    }
  }, [frame?.people_count])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time crowd detection · YOLOv8 + DeepSORT (Simulation Mode)
          </p>
        </div>
        {frame && (
          <span className={clsx('risk-badge', `risk-${frame.risk_level}`)}>
            {frame.surge_active && '⚡ '}
            {frame.risk_level.toUpperCase()} RISK
          </span>
        )}
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users, label: 'People Detected', color: 'text-brand-300',
            value: frame?.people_count ?? '—',
            sub: frame ? `${frame.tracked_ids.entries} entries · ${frame.tracked_ids.exits} exits` : 'Connecting...',
          },
          {
            icon: Activity, label: 'Density Score', color: 'text-risk-medium',
            value: frame ? `${(frame.density_score * 100).toFixed(0)}%` : '—',
            sub: `Anomaly: ${frame ? (frame.anomaly_score * 100).toFixed(0) : 0}%`,
          },
          {
            icon: Zap, label: 'Avg Speed', color: 'text-purple-400',
            value: frame ? `${frame.avg_speed}m/s` : '—',
            sub: `Flow: ${frame?.flow_direction || '—'}`,
          },
          {
            icon: Eye, label: 'Active Tracks', color: 'text-cyan-400',
            value: frame?.tracked_ids.active ?? '—',
            sub: `Camera: ${selectedCamera}`,
          },
        ].map(({ icon: Icon, label, color, value, sub }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className="metric-value">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Video + Heatmap ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <LiveFeed cameraId={selectedCamera} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <HeatmapViewer cameraId={selectedCamera} />

          {/* Recommendations */}
          <RecommendationsPanel />
        </div>
      </div>

      {/* ── All cameras ──────────────────────────────────────────────── */}
      {summary && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-300" />
            All Cameras Overview
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.cameras?.map((cam: any) => (
              <div key={cam.id} className={clsx(
                'glass-card-hover p-3 cursor-pointer',
                cam.id === selectedCamera && 'border-brand-500/40 glow-ring'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{cam.id}</span>
                  <span className={clsx('risk-badge', `risk-${cam.risk}`)}>
                    {cam.risk}
                  </span>
                </div>
                <p className="text-xl font-bold font-mono text-white">{cam.count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cam.name}</p>
                <div className="mt-2">
                  <Sparkline data={[...Array(10)].map(() => Math.round(cam.count * (0.8 + Math.random() * 0.4)))} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationsPanel() {
  const { recommendations } = useCrowdStore()
  const PRIORITY_COLORS: Record<string, string> = {
    immediate: 'text-risk-critical', urgent: 'text-risk-high',
    advisory: 'text-risk-medium', info: 'text-slate-400'
  }
  return (
    <div className="glass-card flex-1 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <AlertTriangle size={14} className="text-risk-medium" />
        <h3 className="text-sm font-semibold text-white">AI Recommendations</h3>
      </div>
      <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
        {recommendations.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">Waiting for stream data...</p>
        ) : recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-base leading-none mt-0.5">{r.icon}</span>
            <div>
              <span className={clsx('font-semibold capitalize', PRIORITY_COLORS[r.priority])}>
                [{r.priority}]
              </span>{' '}
              <span className="text-slate-400">{r.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
