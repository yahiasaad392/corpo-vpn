import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Share2, Settings, FileText, LogOut, Crown, User, Minus, Square, X, ShieldCheck, ClipboardList } from 'lucide-react'

export default function AppShell() {
  const navigate = useNavigate()

  // Read user info + role from localStorage
  let currentUser = null
  try {
    const userStr = localStorage.getItem('vpn_user')
    currentUser = userStr ? JSON.parse(userStr) : null
  } catch { currentUser = null }

  const isAdmin = currentUser?.role === 'admin'

  const handleSignOut = () => {
    localStorage.removeItem('vpn_token')
    localStorage.removeItem('vpn_user')
    navigate('/', { replace: true })
  }

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
    <div className="h-screen w-full bg-[#060818] flex items-center justify-center p-0 md:p-4 lg:p-8 overflow-hidden select-none">
      {/* Native-style Window Frame */}
      <div className="w-full h-full max-w-[1600px] max-h-[1000px] bg-dark-900 rounded-2xl border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-zoom-in">

        {/* Simulated Titlebar */}
        <div className="h-10 bg-dark-900/80 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyan-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Corpo VPN — Secure HQ Tunnel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="p-1.5 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
              <Minus size={12} className="text-slate-500" />
            </div>
            <div className="p-1.5 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
              <Square size={10} className="text-slate-500" />
            </div>
            <div
              onClick={handleSignOut}
              className="p-1.5 hover:bg-red-500/20 group rounded-md transition-colors cursor-pointer"
            >
              <X size={12} className="text-slate-500 group-hover:text-red-400" />
            </div>
          </div>
        </div>

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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Compliant
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
    </div>
  )
}
