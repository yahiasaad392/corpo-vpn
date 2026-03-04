import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  ScanLine, CheckCircle, XCircle, AlertTriangle,
  Monitor, HardDrive, Wifi, Lock, ChevronRight,
  Loader2, Eye, EyeOff
} from 'lucide-react'

// ─── Phase 1: Permission Request ─────────────────────────────────────────────
function PermissionModal({ onAllow, onDeny }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060818]">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative w-[560px] animate-zoom-in">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
              <ScanLine size={42} className="text-cyan-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-[#060818] flex items-center justify-center">
              <span className="text-[10px] font-black text-white">!</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
            Device Access Request
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Before connecting to the corporate network, Corpo VPN requires permission to scan your device for compliance.
          </p>
        </div>

        {/* What we'll check */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">What we'll scan</p>
          {[
            { icon: Shield, label: 'Installed Antivirus software', note: 'via Windows Security Center' },
            { icon: Monitor, label: 'Operating System version', note: 'Windows 10 / 11 required' },
            { icon: HardDrive, label: 'System health & free space', note: 'minimum 2 GB required' },
          ].map(({ icon: Icon, label, note }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-xs text-slate-500">{note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2 mb-8 px-1">
          <Lock size={13} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            All checks run <strong className="text-slate-400">locally on your device</strong>. No data is sent to external servers. This scan is required by your organization's zero-trust policy.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold
              hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            Deny Access
          </button>
          <button
            onClick={onAllow}
            className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
              text-white text-sm font-bold hover:from-cyan-400 hover:to-blue-500
              hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all duration-200
              flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            Allow Device Scan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Phase 2: Live Scanning Animation ────────────────────────────────────────
function ScanningPhase() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length < 3 ? d + '.' : '.'), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060818]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-3xl animate-pulse-glow" />
      </div>

      <div className="relative flex flex-col items-center gap-8 animate-fade-in">
        {/* Animated scan ring */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute inset-0 animate-spin-slow" width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="72" fill="none" stroke="url(#scanGrad)" strokeWidth="2"
              strokeDasharray="60 400" strokeLinecap="round" />
            <defs>
              <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity="0" />
                <stop offset="100%" stopColor="#00f5ff" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="absolute inset-0 animate-spin-reverse" width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(0,245,255,0.15)" strokeWidth="1"
              strokeDasharray="30 350" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-[18px] rounded-full border border-cyan-500/20 bg-dark-900/80" />
          <ScanLine size={40} className="text-cyan-400 relative z-10 animate-pulse" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Scanning Device{dots}</h2>
          <p className="text-slate-500 text-sm">Querying Windows Security Center</p>
        </div>

        {/* Progress items */}
        <div className="w-80 space-y-2">
          {['Checking antivirus products...', 'Verifying OS build version...', 'Analyzing system resources...'].map((item, i) => (
            <div key={item} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
              <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
              <span className="text-sm text-slate-400 font-mono">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Phase 3: Results Gate ────────────────────────────────────────────────────
function ResultsPhase({ results, onProceed, onRetry }) {
  const navigate = useNavigate()

  const checks = [
    {
      key: 'antivirus',
      icon: Shield,
      label: 'Antivirus Protection',
      pass: results.antivirus.pass,
      detail: results.antivirus.pass
        ? `${results.antivirus.products.map(p => p.name).join(', ')}`
        : 'No antivirus detected — Connection will be blocked',
    },
    {
      key: 'os',
      icon: Monitor,
      label: 'Operating System',
      pass: results.os.pass,
      detail: `${results.os.label} (Build ${results.os.release})`,
    },
    {
      key: 'disk',
      icon: HardDrive,
      label: 'System Health',
      pass: results.disk.pass,
      detail: `${results.disk.freeGb} GB free memory available`,
    },
  ]

  const allPass = results.overall

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060818]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-1000
          ${allPass ? 'bg-emerald-500/8' : 'bg-red-500/8'}`} />
      </div>

      <div className="relative w-[600px] animate-zoom-in">
        {/* Status Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-24 h-24 rounded-3xl mb-6 flex items-center justify-center border-2
            ${allPass
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
              : 'bg-red-500/15 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
            }`}>
            {allPass
              ? <ShieldCheck size={44} className="text-emerald-400" />
              : <ShieldX size={44} className="text-red-400" />
            }
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {allPass ? 'Device Compliant' : 'Compliance Failed'}
          </h1>
          <p className="text-slate-400 text-sm max-w-sm">
            {allPass
              ? 'All security checks passed. You may now connect to the HQ gateway.'
              : 'Your device does not meet the security requirements for VPN access.'}
          </p>
        </div>

        {/* Check Results */}
        <div className="space-y-3 mb-8">
          {checks.map(({ key, icon: Icon, label, pass, detail }) => (
            <div key={key} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all
              ${pass
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/8 border-red-500/30'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${pass ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                <Icon size={20} className={pass ? 'text-emerald-400' : 'text-red-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{label}</p>
                  {pass
                    ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    : <XCircle size={16} className="text-red-400 shrink-0" />
                  }
                </div>
                <p className={`text-xs mt-0.5 truncate ${pass ? 'text-emerald-300/70' : 'text-red-300/70'}`}>
                  {detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action */}
        {allPass ? (
          <button
            onClick={onProceed}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600
              text-white text-base font-black tracking-wide
              hover:from-cyan-400 hover:to-blue-500
              hover:shadow-[0_0_30px_rgba(0,245,255,0.35)]
              transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <ShieldCheck size={20} />
            Connect to HQ Gateway
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="space-y-3">
            {!results.antivirus.pass && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  <strong>Action required:</strong> Please install a compatible antivirus (e.g., Windows Defender, Malwarebytes, ESET) and restart the app to re-run the compliance check.
                </p>
              </div>
            )}
            <button
              onClick={onRetry}
              className="w-full py-3.5 rounded-2xl border border-white/10 text-slate-300 font-semibold
                hover:bg-white/5 transition-all duration-200"
            >
              Re-run Compliance Check
            </button>
            <button
              onClick={() => navigate('/landing')}
              className="w-full py-2.5 text-slate-600 text-sm hover:text-slate-400 transition-colors"
            >
              Back to Website
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Denied Phase ─────────────────────────────────────────────────────────────
function DeniedPhase({ onRetry }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060818]">
      <div className="w-[440px] text-center animate-zoom-in">
        <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <EyeOff size={36} className="text-slate-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Access Scan Denied</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          Without device scan permission, we cannot verify compliance. VPN access is blocked until the scan is approved.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/landing')} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-500 text-sm hover:bg-white/5 transition-all">
            Go to Website
          </button>
          <button onClick={onRetry} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all">
            Grant Permission
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ComplianceCheck Orchestrator ───────────────────────────────────────
export default function ComplianceCheck() {
  const navigate = useNavigate()
  // phase: 'permission' | 'scanning' | 'results' | 'denied'
  const [phase, setPhase] = useState('permission')
  const [results, setResults] = useState(null)

  const runScan = useCallback(async () => {
    setPhase('scanning')

    // If running in browser (not Electron), provide realistic mock data
    if (!window.electronAPI?.runComplianceCheck) {
      await new Promise(r => setTimeout(r, 2800))
      setResults({
        os:       { pass: true,  label: 'Windows 11', release: '10.0.22631' },
        antivirus:{ pass: true,  products: [{ name: 'Windows Defender', enabled: true }] },
        disk:     { pass: true,  freeGb: 8 },
        overall:  true,
      })
      setPhase('results')
      return
    }

    try {
      const data = await window.electronAPI.runComplianceCheck()
      // Minimum 2s scanning animation so it feels real
      await new Promise(r => setTimeout(r, 2000))
      setResults(data)
      setPhase('results')
    } catch (err) {
      console.error('Compliance check failed:', err)
      // Graceful fallback — assume failure
      setResults({
        os:       { pass: false, label: 'Unknown', release: '0.0.0' },
        antivirus:{ pass: false, products: [] },
        disk:     { pass: false, freeGb: 0 },
        overall:  false,
      })
      setPhase('results')
    }
  }, [])

  const handleAllow = () => runScan()
  const handleDeny  = () => setPhase('denied')
  const handleRetry = () => setPhase('permission')
  const handleProceed = () => navigate('/app/dashboard')

  if (phase === 'permission') return <PermissionModal onAllow={handleAllow} onDeny={handleDeny} />
  if (phase === 'scanning')   return <ScanningPhase />
  if (phase === 'denied')     return <DeniedPhase onRetry={handleRetry} />
  if (phase === 'results')    return <ResultsPhase results={results} onProceed={handleProceed} onRetry={handleRetry} />
  return null
}
