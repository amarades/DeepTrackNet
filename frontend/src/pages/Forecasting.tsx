/**
 * Forecasting Page — predictive crowd safety analytics
 */
import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, Clock, Zap } from 'lucide-react'
import { predictionsApi } from '@/api/client'
import { useCrowdStore } from '@/store/crowdStore'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs space-y-1.5">
      <p className="text-slate-400 font-mono">+{label} min</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{
            p.name.includes('Risk') || p.name.includes('Prob')
              ? `${(p.value * 100).toFixed(1)}%`
              : p.value
          }</span>
        </p>
      ))}
    </div>
  )
}

export default function Forecasting() {
  const { selectedCamera } = useCrowdStore()
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [allCams, setAllCams] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      predictionsApi.getForecast(selectedCamera, 30),
      predictionsApi.getAllOverview(),
    ]).then(([fc, all]) => {
      setForecast(fc.data)
      setAllCams(all.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedCamera])

  const chartData = forecast?.forecast?.map((f: any) => ({
    min: f.horizon_minutes,
    'Predicted': f.predicted_count,
    'Lower Bound': f.confidence_lower,
    'Upper Bound': f.confidence_upper,
    'Stampede Risk': f.stampede_risk_score,
    'Congestion Prob': f.congestion_probability,
  })) || []

  const risk = forecast?.risk_summary

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Predictive Safety Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Prophet + LSTM ensemble forecast · {selectedCamera}
        </p>
      </div>

      {/* Risk summary cards */}
      {risk && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: TrendingUp, label: 'Overall Risk',
              value: risk.overall_risk.toUpperCase(),
              color: `text-risk-${risk.overall_risk}`,
            },
            {
              icon: Clock, label: 'Peak in',
              value: `+${risk.peak_at_minutes} min`,
              color: 'text-brand-300',
            },
            {
              icon: AlertTriangle, label: 'Stampede Risk',
              value: `${(risk.max_stampede_risk * 100).toFixed(1)}%`,
              color: risk.max_stampede_risk > 0.5 ? 'text-risk-critical' : 'text-risk-medium',
            },
            {
              icon: Zap, label: 'Peak Forecast',
              value: risk.peak_count,
              color: 'text-purple-400',
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
                <Icon size={16} className={color} />
              </div>
              <p className={clsx('text-3xl font-bold font-mono mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forecast chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          30-Minute Crowd Density Forecast with Confidence Band
        </h3>
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6272f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6272f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="min" tick={{ fill: '#475569', fontSize: 11 }}
                tickFormatter={v => `+${v}m`} />
              <YAxis yAxisId="count" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis yAxisId="risk" orientation="right" domain={[0, 1]}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<ForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Area yAxisId="count" type="monotone" dataKey="Upper Bound" fill="rgba(98,114,241,0.1)" stroke="none" />
              <Area yAxisId="count" type="monotone" dataKey="Lower Bound" fill="rgba(10,11,26,1)" stroke="none" />
              <Line yAxisId="count" type="monotone" dataKey="Predicted" stroke="#6272f1" strokeWidth={2.5} dot={{ fill: '#6272f1', r: 4 }} />
              <Line yAxisId="risk" type="monotone" dataKey="Stampede Risk" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
              <Line yAxisId="risk" type="monotone" dataKey="Congestion Prob" stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" dot={false} />
              <ReferenceLine yAxisId="risk" y={0.5} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.4} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recommendations */}
      {forecast?.recommendations && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-risk-medium" />
            AI Safety Recommendations
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {forecast.recommendations.map((r: any, i: number) => (
              <div key={i} className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border',
                r.priority === 'immediate' && 'border-risk-critical/20 bg-risk-critical/5',
                r.priority === 'urgent'    && 'border-risk-high/20 bg-risk-high/5',
                r.priority === 'advisory'  && 'border-risk-medium/20 bg-risk-medium/5',
                r.priority === 'info'      && 'border-white/5 bg-surface-700/30',
              )}>
                <span className="text-xl">{r.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white capitalize">{r.priority}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All cameras risk overview */}
      {allCams && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">All Cameras — 30-min Risk Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(allCams.cameras || {}).map(([camId, data]: [string, any]) => (
              <div key={camId} className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{camId}</span>
                  <span className={clsx('risk-badge', `risk-${data.risk_summary?.overall_risk}`)}>
                    {data.risk_summary?.overall_risk}
                  </span>
                </div>
                <p className="text-lg font-bold font-mono text-white">{data.current_count}</p>
                <p className="text-xs text-slate-500">{data.camera_name}</p>
                <div className="mt-2 h-1 bg-surface-600 rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (data.risk_summary?.max_stampede_risk || 0) * 100)}%`,
                      background: '#ef4444'
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Stampede risk: {((data.risk_summary?.max_stampede_risk || 0) * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
