import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import LandingPage from './pages/LandingPage'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Network from './pages/Network'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import AdminPanel from './pages/AdminPanel'
import Policies from './pages/Policies'

// Simple auth check
function RequireAuth({ children }) {
  const token = localStorage.getItem('vpn_token')
  if (!token) return <Navigate to="/auth" replace />
  return children
}

// Admin-only route guard
function AdminRoute({ children }) {
  const token = localStorage.getItem('vpn_token')
  if (!token) return <Navigate to="/auth" replace />
  
  try {
    const userStr = localStorage.getItem('vpn_user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!user || user.role !== 'admin') {
      return <Navigate to="/app/dashboard" replace />
    }
  } catch {
    return <Navigate to="/app/dashboard" replace />
  }
  
  return children
}

function App() {
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron')

  return (
    <Routes>
      <Route path="/" element={
        isElectron ? <Navigate to="/auth" replace /> : <Navigate to="/landing" replace />
      } />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/auth" element={<Auth />} />

      <Route path="/app" element={
        <RequireAuth><AppShell /></RequireAuth>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />

        {/* Admin-only routes */}
        <Route path="network" element={
          <AdminRoute><Network /></AdminRoute>
        } />
        <Route path="logs" element={
          <AdminRoute><Logs /></AdminRoute>
        } />
        <Route path="admin" element={
          <AdminRoute><AdminPanel /></AdminRoute>
        } />
        <Route path="policies" element={
          <AdminRoute><Policies /></AdminRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App
