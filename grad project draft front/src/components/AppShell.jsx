import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Share2, Settings, FileText, LogOut, Crown, User, Minus, Square, X, ShieldCheck, ClipboardList, Copy } from 'lucide-react'

export default function AppShell() {
  const navigate = useNavigate()
  const [isMaximized, setIsMaximized] = useState(false)
  const [complianceStatus, setComplianceStatus] = useState(() => {
    return localStorage.getItem('vpn_compliance_status') || 'pending'
  })

  // Read user info + role from localStorage
  let currentUser = null
  try {
    const userStr = localStorage.getItem('vpn_user')
    currentUser = userStr ? JSON.parse(userStr) : null
  } catch { currentUser = null }

  const isAdmin = currentUser?.role === 'admin'

  // ── Track maximize state ──
  useEffect(() => {
    if (!window.electronAPI) return

    // Get initial state
    window.electronAPI.windowIsMaximized().then(setIsMaximized)

    // Listen for changes
    const cleanup = window.electronAPI.onMaximizedChange((maximized) => {
      setIsMaximized(maximized)
    })

    return cleanup
  }, [])

  // ── Listen for compliance status changes ──
  useEffect(() => {
    const handler = () => {
      setComplianceStatus(localStorage.getItem('vpn_compliance_status') || 'pending')
    }
    window.addEventListener('compliance-update', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('compliance-update', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const handleSignOut = async () => {
    // Disconnect VPN tunnel if running
    try {
      if (window.electronAPI?.vpnDisconnect) {
        await window.electronAPI.vpnDisconnect()
      }
    } catch (e) {
      console.warn('VPN disconnect on sign-out failed:', e)
    }

    // End backend VPN session
    try {
      const email = currentUser?.email
      if (email) {
        await fetch('http://127.0.0.1:3001/api/vpn/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
      }
    } catch (e) {
      console.warn('Session end on sign-out failed:', e)
    }

    localStorage.removeItem('vpn_token')
    localStorage.removeItem('vpn_user')
    navigate('/', { replace: true })
  }

  // ── Window control handlers ──
  const handleMinimize = () => window.electronAPI?.windowMinimize()
  const handleMaximize = () => window.electronAPI?.windowMaximize()
  const handleClose    = () => window.electronAPI?.windowClose()

  // Build nav items based on role
  const navItems = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Connection' },
    { to: '/app/settings', icon: Settings, label: 'Settings' },
    // Admin-only nav items
    ...(isAdmin ? [
      { to: '/app/network',  icon: Share2,        label: 'HQ Network',  adminOnly: true },
      { to: '/app/logs',     icon: FileText,      label: 'Audit Logs',  adminOnly: true },
      { to: '/app/admin',    icon: Crown,         label: 'Admin Panel', adminOnly: true },
      { to: '/app/policies', icon: ClipboardList, label: 'Policies',    adminOnly: true },
    ] : []),
  ]

  return (
    <div className="h-screen w-full bg-[#060818] flex flex-col overflow-hidden select-none">
      {/* ─── Native Titlebar (draggable + window controls) ─── */}
      <div className="titlebar h-9 bg-[#080a1e] border-b border-white/5 flex items-center justify-between px-3 shrink-0 z-50 relative">
        <div className="flex items-center gap-2 pointer-events-none">
          <Shield size={13} className="text-cyan-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Corpo VPN</span>
        </div>
        <div className="flex items-center window-controls">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <Minus size={14} className="text-slate-400" />
          </button>
          {/* Maximize / Restore */}
          <button
            onClick={handleMaximize}
            className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              /* Restore icon: two overlapping squares */
              <Copy size={12} className="text-slate-400" />
            ) : (
              <Square size={11} className="text-slate-400" />
            )}
          </button>
          {/* Close */}
          <button
            onClick={handleClose}
            className="w-11 h-9 flex items-center justify-center hover:bg-[#e81123] group transition-colors"
            title="Close"
          >
            <X size={14} className="text-slate-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* ─── Main app body ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col shrink-0">
          {/* Logo Area */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">Corpo</h1>
              <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-semibold">VPN Gateway</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 mt-4">
            {/* Regular items */}
            {navItems.filter(i => !i.adminOnly).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Admin section separator */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2 px-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-amber-500/60 font-bold flex items-center gap-1.5">
                    <Crown size={9} className="text-amber-500/60" />
                    Admin Area
                  </p>
                </div>
                {navItems.filter(i => i.adminOnly).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      isActive
                        ? 'nav-item-active border-l-2 border-amber-500/50'
                        : 'nav-item hover:border-l-2 hover:border-amber-500/20'
                    }
                  >
                    <item.icon size={20} className={item.label === 'Admin Panel' ? 'text-amber-400' : ''} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User Info + Sign Out */}
          <div className="p-4 border-t border-white/5 mt-auto bg-white/[0.01]">
            {/* Role badge + email */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 mb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${
                isAdmin
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-800 border-white/10'
              }`}>
                {isAdmin
                  ? <Crown size={16} className="text-amber-400" />
                  : <User size={16} className="text-slate-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate text-white">
                  {currentUser?.email || 'Unknown'}
                </p>
                <div className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-700/50 text-slate-400 border border-white/5'
                }`}>
                  {isAdmin ? <Crown size={7} /> : <Shield size={7} />}
                  {isAdmin ? 'Admin' : 'User'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden gradient-mesh">
          {/* Top Header */}
          <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Security Status:</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                complianceStatus === 'compliant'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : complianceStatus === 'warning'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : complianceStatus === 'non-compliant'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  complianceStatus === 'compliant' ? 'bg-emerald-500 animate-pulse'
                  : complianceStatus === 'warning' ? 'bg-amber-500 animate-pulse'
                  : complianceStatus === 'non-compliant' ? 'bg-red-500 animate-pulse'
                  : 'bg-slate-500'
                }`} />
                {complianceStatus === 'compliant' ? 'Compliant'
                  : complianceStatus === 'warning' ? 'Warnings'
                  : complianceStatus === 'non-compliant' ? 'Non-Compliant'
                  : 'Pending'}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <Crown size={10} />
                  Admin Session
                </div>
              )}
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                V: 4.2.0-stable
              </div>
            </div>
          </header>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
