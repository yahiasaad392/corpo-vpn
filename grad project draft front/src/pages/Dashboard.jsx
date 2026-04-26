import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Shield, ShieldCheck, ShieldX, Zap, Globe, Lock, Info, Building2, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import StatusRing from '../components/StatusRing'
import StatsCard from '../components/StatsCard'
import ComplianceSidebar from '../components/ComplianceSidebar'
import { hqGateway } from '../data/mockData'
import { ALL_CHECKS_MAP } from '../data/complianceChecks'

const POLICY_API = 'http://127.0.0.1:3001/api/policy'
const AUTH_API = 'http://127.0.0.1:3001/api/auth'
const VPN_API = 'http://127.0.0.1:3001/api/vpn'

export default function Dashboard() {
  // Check user role
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('vpn_user')) } catch { return null } })()
  const isAdmin = currentUser?.role === 'admin'

  const [status, setStatus] = useState('disconnected') // disconnected | connecting | connected | error
  const [timer, setTimer] = useState(0)
  const [error, setError] = useState(null)
  const [liveStats, setLiveStats] = useState({ rx: '0 B', tx: '0 B', handshake: '--', endpoint: '--' })
  const [clientIp, setClientIp] = useState('---.---.---')
  
  // Compliance State
  const [isScanning, setIsScanning] = useState(false)
  const [showCompliance, setShowCompliance] = useState(false)
  const [complianceResults, setComplianceResults] = useState(null)
  
  // Policy State
  const [userPolicy, setUserPolicy] = useState(null)
  const [policyLoaded, setPolicyLoaded] = useState(false)
  
  const statusInterval = useRef(null)
  const [activeSessionId, setActiveSessionId] = useState(null)

  const isElectron = !!window.electronAPI?.vpnConnect

  // Load VPN config from backend (auto-provisioned) and show IP
  useEffect(() => {
    if (currentUser?.email) {
      fetch(`${VPN_API}/config?email=${encodeURIComponent(currentUser.email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.provisioned && data.clientIp) {
            setClientIp(data.clientIp)
            // Also save to Electron store for offline use
            if (isElectron && window.electronAPI?.vpnSaveConfig) {
              window.electronAPI.vpnSaveConfig({
                privateKey: data.privateKey,
                clientIp: data.clientIp,
              })
            }
          }
        })
        .catch(() => {
          // Fallback: try loading from local Electron store
          if (isElectron && window.electronAPI?.vpnLoadConfig) {
            window.electronAPI.vpnLoadConfig().then(config => {
              if (config?.clientIp) setClientIp(config.clientIp)
            })
          }
        })
    }
  }, [currentUser?.email, isElectron])

  // Load user's policy on mount (only for non-admins)
  useEffect(() => {
    if (!isAdmin && currentUser?.email) {
      fetch(`${POLICY_API}/my-policy?email=${encodeURIComponent(currentUser.email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.found) setUserPolicy(data.policy)
          setPolicyLoaded(true)
        })
        .catch(() => setPolicyLoaded(true))
    } else {
      setPolicyLoaded(true)
    }
  }, [isAdmin, currentUser?.email])

  // Poll WireGuard status when connected
  useEffect(() => {
    if (status === 'connected' && isElectron) {
      statusInterval.current = setInterval(async () => {
        try {
          const st = await window.electronAPI.vpnStatus()
          if (st.connected) {
            setLiveStats({
              rx: st.rx || '0 B',
              tx: st.tx || '0 B',
              handshake: st.latestHandshake || '--',
              endpoint: st.endpoint || '--',
            })
          } else {
            // Tunnel went down unexpectedly
            setStatus('disconnected')
            setTimer(0)
          }
        } catch { /* ignore poll errors */ }
      }, 3000)
    }
    return () => { if (statusInterval.current) clearInterval(statusInterval.current) }
  }, [status, isElectron])

  // Session timer
  useEffect(() => {
    let interval
    if (status === 'connected') {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [status])

  const handleComplianceScan = async () => {
    setIsScanning(true)
    setShowCompliance(true)
    setError(null)
    
    try {
      if (!isElectron) {
        // Mock for browser — simulate all checks passing
        await new Promise(r => setTimeout(r, 2000))
        const mockResults = {}
        // Generate mock results for all checks in the user's policy
        const allCheckIds = [
          ...(userPolicy?.critical_checks || []),
          ...(userPolicy?.warning_checks || []),
          ...(userPolicy?.info_checks || []),
        ]
        allCheckIds.forEach(id => {
          mockResults[id] = { pass: true, label: 'Passed (Mock)', detail: 'Mock environment' }
        })
        // Also add legacy keys for backwards compat
        mockResults.os = { pass: true, label: 'Windows 11 (Mock)' }
        mockResults.firewall = { pass: true }
        mockResults.defender = { pass: true }
        mockResults.disk = { pass: true, freeGb: 45 }
        mockResults.overall = true
        setComplianceResults(mockResults)
        setIsScanning(false)
        return mockResults
      }

      const results = await window.electronAPI.runComplianceCheck()
      setComplianceResults(results)
      setIsScanning(false)
      return results
    } catch (err) {
      setError('Compliance scan failed to execute')
      setIsScanning(false)
      return null
    }
  }

  const formatTime = (s) => {
    const hrs  = Math.floor(s / 3600).toString().padStart(2, '0')
    const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const secs = (s % 60).toString().padStart(2, '0')
    return `${hrs}:${mins}:${secs}`
  }

  // ─── Helper: Fetch VPN config from backend ────────────────────

  const fetchVpnConfig = async () => {
    try {
      const res = await fetch(`${VPN_API}/config?email=${encodeURIComponent(currentUser.email)}`)
      const data = await res.json()
      if (data.provisioned && data.privateKey && data.clientIp) {
        return { privateKey: data.privateKey, clientIp: data.clientIp }
      }
      return null
    } catch {
      return null
    }
  }

  // ─── Helper: Start VPN session via backend ─────────────────────

  const startVpnSession = async (complianceResults = null) => {
    try {
      const res = await fetch(`${VPN_API}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          complianceResults,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Backend rejected connection')
      }
      return data // { sessionId, privateKey, clientIp, connectedAt, complianceStatus }
    } catch (err) {
      throw err
    }
  }

  // ─── Helper: End VPN session via backend ───────────────────────

  const endVpnSession = async () => {
    try {
      await fetch(`${VPN_API}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          sessionId: activeSessionId,
        }),
      })
    } catch (e) {
      console.warn('Session disconnect notification failed:', e)
    }
  }

  // ─── Real WireGuard Connect / Disconnect ────────────────────

  const handleToggle = useCallback(async () => {
    setError(null)

    if (status === 'connected' || status === 'connecting') {
      // ── Disconnect / Cancel handshake ──
      if (isElectron) {
        const res = await window.electronAPI.vpnDisconnect()
        if (!res.success) setError(res.error)
      }
      // Notify backend to end session
      await endVpnSession()
      setActiveSessionId(null)
      setStatus('disconnected')
      setTimer(0)
      setLiveStats({ rx: '0 B', tx: '0 B', handshake: '--', endpoint: '--' })
      setShowCompliance(false)
      return
    }

    // ── ADMIN BYPASS: Skip compliance entirely ──
    if (isAdmin) {
      setStatus('connecting')

      if (!isElectron) {
        // Browser mock — call backend session API, then simulate connection
        try {
          const session = await startVpnSession(null)
          setActiveSessionId(session.sessionId)
          setClientIp(session.clientIp)
          setTimeout(() => setStatus('connected'), 2000)
        } catch (err) {
          setError(err.message)
          setStatus('error')
        }
        return
      }

      // Start backend session (gets credentials)
      let session
      try {
        session = await startVpnSession(null)
      } catch (err) {
        setError(err.message)
        setStatus('error')
        return
      }

      setActiveSessionId(session.sessionId)
      setClientIp(session.clientIp)

      const res = await window.electronAPI.vpnConnect({
        privateKey: session.privateKey,
        clientIp: session.clientIp,
      })

      if (res.success) {
        const st = await window.electronAPI.vpnStatus()
        if (st.connected) {
          setLiveStats({
            rx: st.rx || '0 B', tx: st.tx || '0 B',
            handshake: st.latestHandshake || 'Just now',
            endpoint: st.endpoint || '80.65.211.27:51820',
          })
        }
        setStatus('connected')
      } else {
        // ── ROLLBACK: VPN connect failed, end backend session ──
        await endVpnSession()
        setActiveSessionId(null)
        setError(res.error)
        setStatus('disconnected')
      }
      return
    }

    // ── USER: STEP 1 — FETCH LATEST POLICY + COMPLIANCE SCAN ──
    setStatus('connecting')

    // Re-fetch policy in real-time (admin may have updated it)
    let freshPolicy = userPolicy
    try {
      const policyRes = await fetch(`${POLICY_API}/my-policy?email=${encodeURIComponent(currentUser.email)}`)
      const policyData = await policyRes.json()
      if (policyData.found) {
        freshPolicy = policyData.policy
        setUserPolicy(freshPolicy) // Update state so sidebar shows new checks immediately
      }
    } catch (e) {
      console.warn('Policy refresh failed, using cached policy:', e)
    }

    const results = await handleComplianceScan()
    
    if (!results) {
      setError('Compliance scan failed.')
      setStatus('disconnected')
      return
    }

    // Evaluate results against the FRESH policy
    const criticalIds = freshPolicy?.critical_checks || []
    const warningIds = freshPolicy?.warning_checks || []

    const criticalFails = criticalIds.filter(id => results[id] && !results[id].pass)
    const warningFails = warningIds.filter(id => results[id] && !results[id].pass)

    // ── SEND ONE COMBINED NOTIFICATION for all failures ──
    const criticalLabels = criticalFails.map(id => ALL_CHECKS_MAP[id]?.label || id)
    const warningLabels = warningFails.map(id => ALL_CHECKS_MAP[id]?.label || id)

    if (criticalFails.length > 0 || warningFails.length > 0) {
      try {
        await fetch(`${POLICY_API}/notify-warning`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: currentUser.email,
            criticalFails: criticalLabels,
            warningFails: warningLabels,
          }),
        })
      } catch (e) {
        console.warn('Compliance notification failed:', e)
      }
    }

    // ── CRITICAL FAILURES → BLOCK ──
    if (criticalFails.length > 0) {
      localStorage.setItem('vpn_compliance_status', 'non-compliant')
      window.dispatchEvent(new Event('compliance-update'))
      setError(`Device non-compliant. ${criticalFails.length} critical check(s) failed. See sidebar for details.`)
      setStatus('disconnected')
      return
    }

    // ── WARNING ONLY → proceed but update status ──
    if (warningFails.length > 0) {
      localStorage.setItem('vpn_compliance_status', 'warning')
      window.dispatchEvent(new Event('compliance-update'))
    } else {
      localStorage.setItem('vpn_compliance_status', 'compliant')
      window.dispatchEvent(new Event('compliance-update'))
    }

    // ── STEP 2: VPN CONNECT via backend session ──
    if (!isElectron) {
      // Browser mock — start session via backend
      try {
        const session = await startVpnSession(results)
        setActiveSessionId(session.sessionId)
        setClientIp(session.clientIp)
        setTimeout(() => {
          setStatus('connected')
          if (warningFails.length === 0) setShowCompliance(false)
        }, 2000)
      } catch (err) {
        setError(err.message)
        setStatus('disconnected')
      }
      return
    }

    // Start backend session (validates compliance server-side + returns credentials)
    let session
    try {
      session = await startVpnSession(results)
    } catch (err) {
      setError(err.message)
      setStatus('disconnected')
      return
    }

    setActiveSessionId(session.sessionId)
    setClientIp(session.clientIp)

    const res = await window.electronAPI.vpnConnect({
      privateKey: session.privateKey,
      clientIp: session.clientIp,
    })

    if (res.success) {
      const st = await window.electronAPI.vpnStatus()
      if (st.connected) {
        setLiveStats({
          rx: st.rx || '0 B',
          tx: st.tx || '0 B',
          handshake: st.latestHandshake || 'Just now',
          endpoint: st.endpoint || '80.65.211.27:51820',
        })
      }
      setStatus('connected')
      // Keep sidebar open if there were warnings
      if (warningFails.length === 0) setShowCompliance(false)
    } else {
      // ── ROLLBACK: VPN connect failed, end backend session ──
      await endVpnSession()
      setActiveSessionId(null)
      setError(res.error)
      setStatus('disconnected')
    }
  }, [status, isElectron, isAdmin, userPolicy, currentUser?.email, activeSessionId])

  return (
    <div className="relative min-h-screen">
      {/* Sidebar integration */}
      <ComplianceSidebar 
        isVisible={showCompliance} 
        isScanning={isScanning} 
        results={complianceResults} 
        onRetry={handleComplianceScan}
        policy={userPolicy}
        isAdmin={isAdmin}
      />

      <div className={`p-8 space-y-8 max-w-7xl mx-auto transition-all duration-500 ${showCompliance || isScanning ? 'mr-80' : ''}`}>
      {/* Error Banner */}
      {error && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border animate-fade-in ${complianceResults && (userPolicy?.critical_checks || []).some(id => complianceResults[id] && !complianceResults[id].pass) ? 'bg-red-600/20 border-red-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className={`text-sm font-semibold text-red-300`}>
              {complianceResults && (userPolicy?.critical_checks || []).some(id => complianceResults[id] && !complianceResults[id].pass)
                ? '⚠️ SYSTEM NON-COMPLIANT'
                : 'Connection Error'
              }
            </p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-xs text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-12">
        <div className="relative group">
          <StatusRing status={status === 'error' ? 'disconnected' : status} />
          <button
            onClick={handleToggle}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl ${
              status === 'connected'
                ? 'bg-emerald-500/10 border-2 border-emerald-500/40 shadow-emerald-500/20'
                : status === 'connecting'
                ? 'bg-amber-500/10 border-2 border-amber-500/40 shadow-amber-500/20 hover:bg-red-500/10 hover:border-red-500/40'
                : status === 'error'
                ? 'bg-red-500/10 border-2 border-red-500/40 shadow-red-500/20 hover:bg-red-500/20'
                : 'bg-cyan-500/10 border-2 border-cyan-500/40 shadow-cyan-500/20 hover:bg-cyan-500/20'
            }`}
          >
            {status === 'connected' ? (
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-2 animate-bounce-slow" />
            ) : status === 'connecting' ? (
              <Zap className="w-16 h-16 text-amber-400 mb-2 animate-pulse" />
            ) : status === 'error' ? (
              <ShieldX className="w-16 h-16 text-red-400 mb-2" />
            ) : (
              <Shield className="w-16 h-16 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {status === 'connected' ? 'Disconnect' : status === 'connecting' ? 'Cancel' : status === 'error' ? 'Retry' : 'Connect'}
            </span>
          </button>
        </div>

        <div className="mt-12 text-center space-y-2">
          <h2 className={`text-4xl font-black tracking-tight transition-all duration-500 ${
            status === 'connected' ? 'text-white' : status === 'error' ? 'text-red-400' : 'text-slate-500'
          }`}>
            {status === 'connected' ? 'WireGuard Tunnel Active' : status === 'connecting' ? 'WireGuard Handshake...' : status === 'error' ? 'Connection Failed' : 'Encrypted Tunnel Idle'}
          </h2>
          <p className="text-slate-500 font-medium">
             Target: <span className="text-cyan-500">{hqGateway.name}</span> • {hqGateway.gatewayIp}
          </p>
          {isAdmin && status === 'disconnected' && (
            <p className="text-amber-400/60 text-xs font-semibold uppercase tracking-wider">Admin — Compliance bypassed</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Client VPN IP" 
          value={status === 'connected' ? clientIp : '---.---.---.---'} 
          icon={Globe} 
          trend={status === 'connected' ? 'Secured' : null}
        />
        <StatsCard 
          label="Protocol" 
          value={hqGateway.protocol} 
          icon={Lock} 
        />
        <StatsCard 
          label="Session Time" 
          value={status === 'connected' ? formatTime(timer) : '00:00:00'} 
          icon={Zap} 
        />
        <StatsCard 
          label="Encryption" 
          value={hqGateway.encryption} 
          icon={Shield} 
          trend="Highest"
        />
      </div>

      {/* Live WireGuard Stats (only when connected) */}
      {status === 'connected' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <StatsCard label="Data Received" value={liveStats.rx} icon={Wifi} />
          <StatsCard label="Data Sent" value={liveStats.tx} icon={Wifi} />
          <StatsCard label="Last Handshake" value={liveStats.handshake} icon={ShieldCheck} />
          <StatsCard label="Endpoint" value={liveStats.endpoint} icon={Globe} />
        </div>
      )}

      {/* HQ Details Card — Admin Only */}
      {isAdmin && (
      <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-cyan-500/10 animate-fade-in">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
               <Building2 className="text-cyan-400 w-7 h-7" />
            </div>
            <div>
               <h3 className="text-lg font-bold text-white">Gateway Details</h3>
               <p className="text-sm text-slate-500">Endpoint: <span className="text-slate-300 font-mono text-xs">{hqGateway.gatewayIp}:51820</span></p>
            </div>
         </div>
         
         <div className="flex items-center gap-8">
            <div className="text-center">
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Status</p>
               <div className="flex items-center gap-1.5">
                 <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-neon-green animate-pulse' : 'bg-slate-600'}`} />
                 <span className={`text-xs font-mono ${status === 'connected' ? 'text-neon-green' : 'text-slate-500'}`}>
                   {status === 'connected' ? 'LIVE' : 'IDLE'}
                 </span>
               </div>
            </div>
            <div className="text-center">
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Uptime</p>
               <span className="text-xs font-mono text-cyan-400">{hqGateway.uptime}</span>
            </div>
            <div className="text-center">
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Ping</p>
               <span className="text-xs font-mono text-cyan-400">{hqGateway.ping} ms</span>
            </div>
         </div>
      </div>
      )}
      </div>
    </div>
  )
}
