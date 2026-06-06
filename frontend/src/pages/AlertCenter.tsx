/**
 * Alert Center — full alert management with history and SHAP explainability
 */
import { useEffect, useState } from 'react'
import { Bell, CheckCircle, Filter, AlertTriangle, Info, Zap } from 'lucide-react'
import { alertsApi } from '@/api/client'
import { useCrowdStore } from '@/store/crowdStore'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const SEV_ICONS: Record<string, any> = {
  info: Info, warning: AlertTriangle, high: Zap, critical: Bell
}

export default function AlertCenter() {
  const { alerts, setAlerts, acknowledgeAlert } = useCrowdStore()
  const [filter, setFilter] = useState<string>('all')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      alertsApi.list({ limit: 50 }),
      alertsApi.stats(),
    ]).then(([list, st]) => {
      setAlerts(list.data.alerts)
      setStats(st.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? alerts
    : filter === 'unacked'
    ? alerts.filter(a => !a.is_acknowledged)
    : alerts.filter(a => a.severity === filter)

  const handleAck = async (id: number) => {
    try {
      await alertsApi.acknowledge(id)
      acknowledgeAlert(id)
      toast.success('Alert acknowledged')
    } catch {
      toast.error('Failed to acknowledge')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {stats?.unacknowledged ?? 0} unacknowledged alerts
          </p>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-300' },
            { label: 'Critical', value: stats.by_severity?.critical || 0, color: 'text-risk-critical' },
            { label: 'High', value: stats.by_severity?.high || 0, color: 'text-risk-high' },
            { label: 'Pending', value: stats.unacknowledged, color: 'text-risk-medium' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
              <p className={clsx('text-3xl font-bold font-mono mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-500" />
        {['all', 'unacked', 'critical', 'high', 'warning', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-full border transition-all capitalize',
              f === filter
                ? 'bg-brand-600/20 text-brand-300 border-brand-500/30'
                : 'border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
            )}
          >
            {f === 'unacked' ? 'Unacknowledged' : f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {loading && (
          <div className="glass-card p-8 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="glass-card p-10 text-center">
            <CheckCircle size={32} className="text-risk-low mx-auto mb-2" />
            <p className="text-slate-400">No alerts match this filter</p>
          </div>
        )}
        {filtered.map((alert) => {
          const SevIcon = SEV_ICONS[alert.severity] || Bell
          const isExpanded = expanded === alert.id
          return (
            <div
              key={alert.id}
              className={clsx(
                'glass-card overflow-hidden transition-all duration-200',
                `alert-${alert.severity}`,
                alert.is_acknowledged && 'opacity-50'
              )}
            >
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/2"
                onClick={() => setExpanded(isExpanded ? null : alert.id)}
              >
                <SevIcon size={16} className={clsx(
                  'shrink-0 mt-0.5',
                  alert.severity === 'critical' && 'text-risk-critical',
                  alert.severity === 'high'     && 'text-risk-high',
                  alert.severity === 'warning'  && 'text-risk-medium',
                  alert.severity === 'info'     && 'text-blue-400',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{alert.message}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={clsx('risk-badge', `risk-${
                        alert.severity === 'warning' ? 'medium' : alert.severity
                      }`)}>
                        {alert.severity}
                      </span>
                      {!alert.is_acknowledged && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAck(alert.id) }}
                          className="text-xs btn-ghost py-1 px-2"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-500">{alert.camera_name}</span>
                    <span className="text-xs text-slate-500">{alert.people_count} people</span>
                    <span className="text-xs text-slate-500">
                      Density: {(alert.density_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-600">
                      {format(parseISO(alert.created_at), 'HH:mm · dd MMM')}
                    </span>
                    {alert.is_acknowledged && (
                      <span className="text-xs text-risk-low flex items-center gap-1">
                        <CheckCircle size={10} /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded — AI reasoning + SHAP */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-fade-in">
                  {alert.ai_reasoning && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        AI Reasoning
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed bg-surface-700/50 rounded-lg p-3">
                        {alert.ai_reasoning}
                      </p>
                    </div>
                  )}
                  {alert.shap_values && Object.keys(alert.shap_values).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Feature Importance (SHAP)
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(alert.shap_values).map(([feat, val]: [string, any]) => (
                          <div key={feat} className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 shrink-0">{feat.replace('_', ' ')}</span>
                            <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, val * 200)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-brand-300 w-12 text-right">
                              {val.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
