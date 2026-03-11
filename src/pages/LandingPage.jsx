import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, Globe, Lock, ArrowRight, CheckCircle, Building2, Terminal, Loader2, Download, Monitor } from 'lucide-react'
import { appFeatures } from '../data/mockData'

function InstallerModal({ os, onComplete }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = [
    { label: 'Initializing...', icon: Monitor },
    { label: 'Downloading binaries...', icon: Download },
    { label: 'Unpacking assets...', icon: Shield },
    { label: 'Registering security services...', icon: Lock },
    { label: 'Optimizing tunnel pipeline...', icon: Zap },
    { label: 'Finalizing setup...', icon: CheckCircle },
  ]

  React.useEffect(() => {
    let interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (step < steps.length - 1) {
            setStep(s => s + 1)
            return 0
          } else {
            clearInterval(interval)
            setTimeout(onComplete, 500)
            return 100
          }
        }
        return p + Math.random() * 15
      })
    }, 150)
    return () => clearInterval(interval)
  }, [step, steps.length, onComplete])

  const ActiveIcon = steps[step].icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-[480px] bg-[#f0f0f0] rounded-lg shadow-2xl border border-white/20 overflow-hidden flex flex-col text-slate-800 animate-zoom-in">
        {/* Titlebar */}
        <div className="h-8 bg-gradient-to-b from-slate-100 to-slate-200 border-b border-slate-300 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-600" />
            <span className="text-[11px] font-medium">Corpo VPN Setup ({os})</span>
          </div>
          <div className="flex gap-1.5 opacity-50">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex gap-6 bg-white">
          <div className="w-24 h-24 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <ActiveIcon size={48} className="text-blue-600 animate-pulse" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Installing Gateway Access</h3>
              <p className="text-sm text-slate-500 mt-1">Please wait while the setup wizard installs Corpo VPN on your system.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{steps[step].label}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono italic">
              <Terminal size={10} />
              <span>C:\Windows\System32\drivers\nexus_tunnel_v4.sys ... OK</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
          <button disabled className="px-6 py-1.5 rounded bg-white border border-slate-300 text-xs font-medium text-slate-400">Back</button>
          <button disabled className="px-6 py-1.5 rounded bg-blue-600 border border-blue-700 text-xs font-medium text-white shadow-sm opacity-50">Next</button>
          <button className="px-6 py-1.5 rounded bg-white border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none pointer-events-none">
      {/* Window chrome */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-dark-800/90 border-b border-white/8">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <div className="flex-1 flex justify-center">
              <div className="text-xs text-slate-500 font-mono">Corpo VPN — HQ Dashboard</div>
          </div>
        </div>
        {/* App body */}
        <div className="flex bg-dark-900/95">
          {/* Sidebar */}
          <div className="w-16 bg-dark-800/80 border-r border-white/5 flex flex-col items-center gap-4 py-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            {['⬜','⬜','⬜','⬜'].map((_, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center
                ${i === 0 ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5'}`}>
                <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-cyan-400' : 'bg-slate-600'}`} />
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-5">
            {/* Connect ring mock */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-neon-green/40"
                  style={{ background: 'conic-gradient(#00ff88 100%, rgba(255,255,255,0.05) 0%)' }} />
                <div className="absolute inset-1 rounded-full bg-dark-900" />
                <div className="relative z-10 flex flex-col items-center">
                  <Shield size={20} className="text-neon-green mb-0.5" fill="rgba(0,255,136,0.15)" />
                  <span className="text-xs font-bold text-neon-green">Connected</span>
                </div>
              </div>
              <div className="text-xs text-neon-green font-semibold mt-1" style={{ textShadow: '0 0 10px rgba(0,255,136,0.5)' }}>
                Protected
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Internal IP', value: '10.200.5.84',    color: 'text-neon-cyan'  },
                { label: 'Ping',      value: '18 ms',          color: 'text-neon-green' },
                { label: 'Tunnel',    value: 'IPsec+IKEv2',    color: 'text-blue-400'   },
                { label: 'Encryption', value: 'AES-256-GCM',   color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 border border-white/8 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">{label}</div>
                  <div className={`text-[11px] font-semibold font-mono mt-0.5 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            {/* Server */}
            <div className="bg-white/5 border border-white/8 rounded-lg p-3 flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <div>
                <div className="text-[11px] font-semibold text-white">Main HQ · New York</div>
                <div className="text-[10px] text-slate-500 font-mono">hq-gw.nexuscorp.internal</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                <span className="text-[10px] text-neon-green">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glow under mockup */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full blur-3xl bg-cyan-500/20" />
    </div>
  )
}

function FeatureCard({ feature }) {
  return (
    <div className="glass-card p-6 hover:bg-white/8 hover:border-cyan-500/20 transition-all duration-300 group hover:-translate-y-1">
      <div className="text-3xl mb-4">{feature.icon}</div>
      <h3 className="text-base font-semibold text-white mb-2 group-hover:text-neon-cyan transition-colors">{feature.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(null)
  const [installing, setInstalling] = useState(null)
  const [installSuccess, setInstallSuccess] = useState(false)

  const handleDownload = (os) => {
    if (os === 'Windows') {
      setDownloading(os)
      setInstallSuccess(false)
      
      // Since this is a local development environment, we guide the user to the real build output.
      // In a real production scenario, this would be a direct link to the hosted .exe.
      console.log("Real Installer Request: Please run 'npm run electron:build' to generate the setup file in dist-electron/")
      
      setTimeout(() => {
        setDownloading(null)
        setInstalling(os)
      }, 1500)
    } else {
      alert(`${os} build is not configured in this prototype. Focus on Windows NSIS.`)
    }
  }

  const completeInstallation = () => {
    setInstalling(null)
    setInstallSuccess(true)
  }

  return (
    <div className="min-h-screen gradient-mesh overflow-y-auto">
      {/* Installation Simulation Overlay */}
      {installing && (
        <InstallerModal os={installing} onComplete={completeInstallation} />
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md border-b border-white/5 bg-dark-900/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan">
            <Shield size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Corpo VPN</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          {['Compliance', 'HQ Network', 'Enterprise', 'Support'].map(l => (
            <a key={l} href="#" className="hover:text-white transition-colors duration-150">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold">
           <Monitor size={14} className="text-cyan-500" />
           Web Access Only
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 text-center overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-purple-500/6 blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-blue-500/6 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 mb-8 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
          Enterprise Grade Security · Zero-Trust Ready
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 animate-slide-up">
          <span className="text-white">Secure HQ.</span>{' '}
          <span className="neon-text-cyan">Compliant.</span>{' '}
          <span className="text-white">Private.</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
          Corpo VPN provides encrypted access to company headquarters and internal resources. 
          Deploy the standalone desktop application to begin secure operations.
        </p>

        {/* Trust bullets */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-sm">
          {['Compliance Verified', 'AES-256-GCM', 'HQ Gateway Tunnel', 'SAML/MFA Support'].map(item => (
            <div key={item} className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle size={14} className="text-neon-green" />
              {item}
            </div>
          ))}
        </div>

        {/* App Mockup */}
        <div className="mb-16 animate-float">
          <DashboardMockup />
        </div>
      </section>

      {/* Download Section */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Get Corpo VPN</h2>
          <p className="text-slate-500 mb-10">Deploy to your workstation for secure remote work access.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {[
              { os: 'Windows', icon: '🪟', sub: 'Windows 10/11 64-bit', color: 'from-blue-600 to-blue-700' },
              { os: 'macOS',   icon: '🍎', sub: 'macOS 12+ Universal', color: 'from-slate-600 to-slate-700' },
              { os: 'Linux',   icon: '🐧', sub: '.deb / .rpm / AppImage', color: 'from-orange-600 to-orange-700' },
            ].map(({ os, icon, sub, color }) => (
              <button
                key={os}
                onClick={() => handleDownload(os)}
                disabled={downloading !== null}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-br ${color}
                  ${downloading === os ? 'opacity-100 scale-95 ring-4 ring-white/20' : downloading ? 'opacity-40 grayscale' : 'hover:opacity-90 hover:scale-105'} 
                  transition-all duration-300 group shadow-lg min-w-52 relative overflow-hidden`}
              >
                {downloading === os && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
                    <Zap size={24} className="text-white animate-bounce" />
                  </div>
                )}
                <span className="text-3xl">{icon}</span>
                <div className="text-left">
                  <div className="text-white font-semibold">Download for {os}</div>
                  <div className="text-white/60 text-xs mt-0.5">{sub}</div>
                </div>
                <ArrowRight size={16} className={`ml-auto text-white/60 group-hover:translate-x-1 transition-transform ${downloading === os ? 'opacity-0' : ''}`} />
              </button>
            ))}
          </div>

          {/* Install Success Message */}
          {installSuccess && (
            <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-fade-in">
              <div className="flex items-center justify-center gap-3 text-emerald-400 font-bold text-lg mb-2">
                <CheckCircle size={24} />
                Installation Successful!
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Corpo VPN setup has been verified. <br />
                <strong>Production Installer Path:</strong> <code className="text-cyan-400">/dist-electron/NexusVPN Setup 1.0.0.exe</code>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/app/dashboard')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                    text-white font-bold hover:shadow-glow-cyan transition-all duration-300 hover:scale-105"
                >
                  <Monitor size={18} />
                  Launch Development Preview
                </button>
                <p className="text-[10px] text-slate-500 italic">
                  Note: To generate the actual .exe file, please run <strong>npm run electron:build</strong> in your terminal.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Why Corpo VPN?</h2>
            <p className="text-slate-500">Industry-leading secure access for the modern distributed workforce.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appFeatures.map(f => <FeatureCard key={f.title} feature={f} />)}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="px-6 py-12 border-t border-white/5 border-b border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '100+',   label: 'Enterprise Clients' },
            { value: '99.99%', label: 'Gateway Uptime'    },
            { value: '24/7',   label: 'Security Ops'      },
            { value: '< 1ms',  label: 'Tunnel Latency'    },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-black neon-text-cyan">{value}</div>
              <div className="text-sm text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="px-8 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-cyan-500" />
          <span className="text-sm text-slate-600">© 2026 Corpo VPN. Internal Use Only.</span>
        </div>
        <div className="flex gap-6 text-xs text-slate-700">
          {['Privacy Policy', 'Terms of Service', 'Contact', 'Status'].map(l => (
            <a key={l} href="#" className="hover:text-slate-400 transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
