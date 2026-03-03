import React, { useState, useEffect } from 'react'
import { Shield, ShieldCheck, Zap, Globe, Lock, Info, Building2 } from 'lucide-react'
import StatusRing from '../components/StatusRing'
import StatsCard from '../components/StatsCard'
import { hqGateway, connectionStats } from '../data/mockData'

export default function Dashboard() {
  const [status, setStatus] = useState('disconnected') // disconnected, connecting, connected
  const [timer, setTimer] = useState(0)

  // Simulation: Connect / Disconnect
  const handleToggle = () => {
    if (status === 'connected') {
      setStatus('disconnected')
      setTimer(0)
    } else {
      setStatus('connecting')
      setTimeout(() => {
        setStatus('connected')
      }, 3000)
    }
  }

  useEffect(() => {
    let interval
    if (status === 'connected') {
      interval = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status])

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0')
    const secs = (s % 60).toString().padStart(2, '0')
    return `00:${mins}:${secs}`
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-12">
        <div className="relative group">
          <StatusRing status={status} />
          <button
            onClick={handleToggle}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl ${
              status === 'connected'
                ? 'bg-emerald-500/10 border-2 border-emerald-500/40 shadow-emerald-500/20'
                : status === 'connecting'
                ? 'bg-amber-500/10 border-2 border-amber-500/40 shadow-amber-500/20'
                : 'bg-cyan-500/10 border-2 border-cyan-500/40 shadow-cyan-500/20 hover:bg-cyan-500/20'
            }`}
          >
            {status === 'connected' ? (
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-2 animate-bounce-slow" />
            ) : status === 'connecting' ? (
              <Zap className="w-16 h-16 text-amber-400 mb-2 animate-pulse" />
            ) : (
              <Shield className="w-16 h-16 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {status === 'connected' ? 'Protected' : status === 'connecting' ? 'Handshake' : 'Connect'}
            </span>
          </button>
        </div>

        <div className="mt-12 text-center space-y-2">
          <h2 className={`text-4xl font-black tracking-tight transition-all duration-500 ${
            status === 'connected' ? 'text-white' : 'text-slate-500'
          }`}>
            {status === 'connected' ? 'Internal Access Granted' : status === 'connecting' ? 'Initiating Pipeline...' : 'Encrypted Tunnel Idle'}
          </h2>
          <p className="text-slate-500 font-medium">
             Target: <span className="text-cyan-500">{hqGateway.name}</span> • {hqGateway.location}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Internal Virtual IP" 
          value={status === 'connected' ? connectionStats.internalIp : '---.---.---.---'} 
          icon={Globe} 
          trend={status === 'connected' ? 'Secured' : null}
        />
        <StatsCard 
          label="Tunnel Protocol" 
          value={hqGateway.protocol} 
          icon={Lock} 
        />
        <StatsCard 
          label="Session Time" 
          value={status === 'connected' ? formatTime(timer) : '00:00:00'} 
          icon={Zap} 
        />
        <StatsCard 
          label="Enc. Strength" 
          value={hqGateway.encryption} 
          icon={Shield} 
          trend="Highest"
        />
      </div>

      {/* HQ Details Card */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-cyan-500/10 animate-fade-in">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
               <Building2 className="text-cyan-400 w-7 h-7" />
            </div>
            <div>
               <h3 className="text-lg font-bold text-white">HQ Gateway Details</h3>
               <p className="text-sm text-slate-500">Authenticated Gateway: <span className="text-slate-300 font-mono text-xs">{hqGateway.gatewayIp}</span></p>
            </div>
         </div>
         
         <div className="flex items-center gap-8">
            <div className="text-center">
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Gateway Load</p>
               <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${hqGateway.load}%` }} />
                  </div>
                  <span className="text-xs font-mono text-emerald-400">{hqGateway.load}%</span>
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
    </div>
  )
}
