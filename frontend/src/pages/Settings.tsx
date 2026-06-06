/**
 * Settings Page — threshold config + camera management + demo accounts
 */
import { useState } from 'react'
import { Settings as SettingsIcon, Camera, Bell, Shield, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const CAMERAS = [
  { id: 'CAM_01', name: 'Main Entrance', location: 'Building A, Gate 1', status: 'active' },
  { id: 'CAM_02', name: 'Food Court', location: 'Block B, Level 2', status: 'active' },
  { id: 'CAM_03', name: 'Emergency Exit', location: 'Block C, Exit 3', status: 'active' },
  { id: 'CAM_04', name: 'Central Plaza', location: 'Outdoor, Main Area', status: 'active' },
]

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Icon size={15} className="text-brand-300" /> {title}
      </h3>
      {children}
    </div>
  )
}

function SliderField({ label, value, min, max, step, unit, onChange }: any) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs font-mono text-brand-300">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-surface-600 rounded-full appearance-none cursor-pointer accent-brand-500"
      />
    </div>
  )
}

export default function Settings() {
  const [thresholds, setThresholds] = useState({
    medium: 55, high: 75, critical: 90,
    countMedium: 50, countHigh: 100, countCritical: 200,
    alertCooldown: 5, frameRate: 2,
  })

  const set = (key: string) => (val: number) =>
    setThresholds(prev => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure thresholds, cameras, and notifications</p>
      </div>

      {/* Thresholds */}
      <Section title="Crowd Density Thresholds" icon={SettingsIcon}>
        <div className="space-y-4">
          <SliderField label="Medium density threshold" value={thresholds.medium}
            min={30} max={70} step={5} unit="%" onChange={set('medium')} />
          <SliderField label="High density threshold" value={thresholds.high}
            min={60} max={85} step={5} unit="%" onChange={set('high')} />
          <SliderField label="Critical density threshold" value={thresholds.critical}
            min={80} max={99} step={1} unit="%" onChange={set('critical')} />
          <div className="flex gap-2 mt-4 p-3 rounded-lg bg-surface-700/50 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-risk-low" /><span>Safe &lt; {thresholds.medium}%</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-risk-medium" /><span>Medium {thresholds.medium}–{thresholds.high}%</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-risk-high" /><span>High {thresholds.high}–{thresholds.critical}%</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-risk-critical" /><span>Critical &gt; {thresholds.critical}%</span></div>
          </div>
        </div>
      </Section>

      {/* People Count Thresholds */}
      <Section title="Count-Based Thresholds" icon={SettingsIcon}>
        <div className="space-y-4">
          <SliderField label="Medium alert threshold" value={thresholds.countMedium}
            min={10} max={100} step={5} unit=" people" onChange={set('countMedium')} />
          <SliderField label="High alert threshold" value={thresholds.countHigh}
            min={50} max={300} step={10} unit=" people" onChange={set('countHigh')} />
          <SliderField label="Critical alert threshold" value={thresholds.countCritical}
            min={100} max={1000} step={25} unit=" people" onChange={set('countCritical')} />
        </div>
      </Section>

      {/* Notification settings */}
      <Section title="Notifications" icon={Bell}>
        <div className="space-y-3">
          {[
            { label: 'Email Alerts', sub: 'SMTP email notifications on critical events', enabled: false },
            { label: 'SMS Alerts', sub: 'Twilio SMS to security personnel', enabled: false },
            { label: 'Telegram Bot', sub: 'Real-time bot messages to security channel', enabled: true },
            { label: 'Dashboard Alerts', sub: 'In-browser toast notifications', enabled: true },
          ].map(({ label, sub, enabled: def }) => {
            const [on, setOn] = useState(def)
            return (
              <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-surface-700/40">
                <div>
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>
                <button
                  onClick={() => setOn(!on)}
                  className={`w-10 h-5 rounded-full transition-all relative ${on ? 'bg-brand-600' : 'bg-surface-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Camera list */}
      <Section title="Camera Management" icon={Camera}>
        <div className="space-y-2">
          {CAMERAS.map(cam => (
            <div key={cam.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/40">
              <Camera size={16} className="text-brand-300 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{cam.name}</p>
                <p className="text-xs text-slate-500">{cam.id} · {cam.location}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-risk-low">
                <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
                {cam.status}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Demo accounts */}
      <Section title="Demo Accounts" icon={Shield}>
        <div className="space-y-2">
          {[
            { email: 'admin@crowdsafe.ai', password: 'Admin@123', role: 'Admin' },
            { email: 'security@crowdsafe.ai', password: 'Security@123', role: 'Security Officer' },
            { email: 'manager@crowdsafe.ai', password: 'Manager@123', role: 'Event Manager' },
            { email: 'viewer@crowdsafe.ai', password: 'Viewer@123', role: 'Viewer' },
          ].map(acc => (
            <div key={acc.email} className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/40 text-xs">
              <div className="flex-1">
                <span className="font-mono text-slate-300">{acc.email}</span>
                <span className="text-slate-600 mx-2">·</span>
                <span className="font-mono text-brand-300">{acc.password}</span>
              </div>
              <span className="text-slate-500">{acc.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <button
        onClick={() => toast.success('Settings saved!')}
        className="btn-primary flex items-center gap-2"
      >
        <Save size={15} /> Save Configuration
      </button>
    </div>
  )
}
