import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BarChart3, TrendingUp, Bell, Settings,
  Menu, X, Shield, Wifi, WifiOff, ChevronDown, LogOut, Eye
} from 'lucide-react'
import { useCrowdStore } from '@/store/crowdStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Live Monitor' },
  { to: '/analytics',  icon: BarChart3,       label: 'Analytics'   },
  { to: '/forecasting',icon: TrendingUp,      label: 'Forecasting' },
  { to: '/alerts',     icon: Bell,            label: 'Alert Center'},
  { to: '/settings',   icon: Settings,        label: 'Settings'    },
]

const CAMERAS = [
  { id: 'CAM_01', name: 'Main Entrance' },
  { id: 'CAM_02', name: 'Food Court'   },
  { id: 'CAM_03', name: 'Emergency Exit'},
  { id: 'CAM_04', name: 'Central Plaza'},
]

export default function Layout() {
  const { wsConnected, selectedCamera, setSelectedCamera, alerts, sidebarCollapsed, toggleSidebar } = useCrowdStore()
  const [camOpen, setCamOpen] = useState(false)
  const navigate = useNavigate()

  const unacked = alerts.filter(a => !a.is_acknowledged).length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={clsx(
        'flex flex-col border-r border-white/5 transition-all duration-300 shrink-0',
        'bg-surface-800',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Eye size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-tight">CrowdSafe AI</p>
              <p className="text-[10px] text-slate-500">Safety Analytics</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active', sidebarCollapsed && 'justify-center px-0')
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
              {!sidebarCollapsed && to === '/alerts' && unacked > 0 && (
                <span className="ml-auto bg-risk-critical text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unacked > 9 ? '9+' : unacked}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar toggle */}
        <div className="p-3 border-t border-white/5">
          <button onClick={toggleSidebar} className="sidebar-link w-full justify-center">
            {sidebarCollapsed ? <Menu size={18} /> : <><X size={18} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-surface-800/80 backdrop-blur shrink-0">
          {/* Camera selector */}
          <div className="relative">
            <button
              onClick={() => setCamOpen(!camOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-700 border border-white/5 text-sm text-slate-300 hover:text-white hover:border-brand-500/30 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
              <span>{CAMERAS.find(c => c.id === selectedCamera)?.name || selectedCamera}</span>
              <ChevronDown size={14} />
            </button>
            {camOpen && (
              <div className="absolute top-full mt-1 left-0 glass-card py-1 min-w-[180px] z-50 animate-slide-in">
                {CAMERAS.map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => { setSelectedCamera(cam.id); setCamOpen(false) }}
                    className={clsx(
                      'w-full text-left px-4 py-2 text-sm hover:bg-surface-600 transition-colors',
                      cam.id === selectedCamera ? 'text-brand-300' : 'text-slate-400'
                    )}
                  >
                    {cam.name}
                    <span className="text-slate-600 text-xs ml-1">({cam.id})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* WS status */}
            <div className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full',
              wsConnected
                ? 'bg-risk-low/10 text-risk-low border border-risk-low/20'
                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
            )}>
              {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {wsConnected ? 'Live' : 'Connecting'}
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/login')}>
              <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                <Shield size={14} className="text-brand-300" />
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
