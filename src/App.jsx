import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ComplianceCheck from './pages/ComplianceCheck'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Network from './pages/Network'
import Settings from './pages/Settings'
import Logs from './pages/Logs'

function App() {
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron')

  return (
    <Routes>
      <Route path="/" element={
        isElectron ? <Navigate to="/compliance" replace /> : <Navigate to="/landing" replace />
      } />
      <Route path="/landing" element={<LandingPage />} />
      
      {/* Compliance Gate — must pass before entering the app */}
      <Route path="/compliance" element={<ComplianceCheck />} />

      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="network" element={<Network />} />
        <Route path="settings" element={<Settings />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  )
}

export default App
