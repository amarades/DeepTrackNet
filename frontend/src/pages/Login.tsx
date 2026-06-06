/**
 * Login Page — JWT authentication
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, Lock, Mail } from 'lucide-react'
import { authApi } from '@/api/client'
import toast from 'react-hot-toast'

const DEMO = [
  { role: 'Admin', email: 'admin@crowdsafe.ai', password: 'Admin@123' },
  { role: 'Security', email: 'security@crowdsafe.ai', password: 'Security@123' },
  { role: 'Manager', email: 'manager@crowdsafe.ai', password: 'Manager@123' },
]

export default function Login() {
  const [email, setEmail] = useState('admin@crowdsafe.ai')
  const [password, setPassword] = useState('Admin@123')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      localStorage.setItem('access_token', res.data.access_token)
      toast.success(`Welcome back, ${res.data.user.full_name}!`)
      navigate('/dashboard')
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-ring">
            <Shield size={26} className="text-brand-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">CrowdSafe AI</h1>
          <p className="text-slate-500 text-sm mt-1">Crowd Monitoring & Safety Analytics</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-700 border border-white/5 text-white text-sm rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-700 border border-white/5 text-white text-sm rounded-xl pl-9 pr-10 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base flex items-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Shield size={16} />
              }
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-xs text-slate-500 mb-3">Quick login — demo accounts:</p>
            <div className="space-y-2">
              {DEMO.map(d => (
                <button
                  key={d.role}
                  onClick={() => { setEmail(d.email); setPassword(d.password) }}
                  className="w-full text-left p-2.5 rounded-lg bg-surface-700/50 hover:bg-surface-700 border border-white/5 hover:border-brand-500/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{d.role}</span>
                    <span className="text-[10px] font-mono text-slate-500">{d.email}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
