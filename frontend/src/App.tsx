import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Analytics from '@/pages/Analytics'
import Forecasting from '@/pages/Forecasting'
import AlertCenter from '@/pages/AlertCenter'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="forecasting" element={<Forecasting />} />
        <Route path="alerts" element={<AlertCenter />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
