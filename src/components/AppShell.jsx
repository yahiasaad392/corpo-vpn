import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Share2, Settings, FileText, LogOut, Building2, Minus, Square, X } from 'lucide-react'

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Connection' },
  { to: '/app/network', icon: Share2, label: 'HQ Network' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
  { to: '/app/logs', icon: FileText, label: 'Audit Logs' },
]

export default function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-[#060818] flex items-center justify-center p-0 md:p-4 lg:p-8 overflow-hidden select-none">
      {/* Native-style Window Frame */}
      <div className="w-full h-full max-w-[1600px] max-h-[1000px] bg-dark-900 rounded-2xl border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-zoom-in">
        
        {/* Simulated Titlebar */}
        <div className="h-10 bg-dark-900/80 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyan-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Corporate Connect — Secure HQ Tunnel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="p-1.5 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
              <Minus size={12} className="text-slate-500" />
            </div>
            <div className="p-1.5 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
              <Square size={10} className="text-slate-500" />
            </div>
            <div 
              onClick={() => navigate('/')}
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
                <h1 className="font-bold text-lg tracking-tight text-white leading-none">Nexus</h1>
                <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-semibold">Corporate Connect</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 mt-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User / Org Info */}
            <div className="p-4 border-t border-white/5 mt-auto bg-white/[0.01]">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/50 transition-colors overflow-hidden">
                   <Building2 size={20} className="text-slate-400 group-hover:text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">HQ Operations</p>
                  <p className="text-[11px] text-slate-500 truncate">NY Main Office</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col relative overflow-hidden gradient-mesh">
            {/* Top Header / Status Pill */}
            <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                 <span className="text-xs font-medium text-slate-500">Security Status:</span>
                 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   Compliant
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
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
