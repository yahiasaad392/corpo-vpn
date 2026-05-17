import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, Globe, Lock, ArrowRight, CheckCircle, Building2, Terminal, Loader2, Download, Monitor, Github } from 'lucide-react'
import { appFeatures } from '../data/mockData'

import SplitText from '../components/reactbits/SplitText'
import GradientText from '../components/reactbits/GradientText'
import CountUp from '../components/reactbits/CountUp'
import Magnet from '../components/reactbits/Magnet'
import ScrollReveal from '../components/reactbits/ScrollReveal'
import RotatingText from '../components/reactbits/RotatingText'
import StarBorder from '../components/reactbits/StarBorder'
import ShinyText from '../components/reactbits/ShinyText'
import ScrambledText from '../components/reactbits/ScrambledText'
import Orb from '../components/reactbits/Orb'

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none pointer-events-none group mt-10">
      {/* Window chrome */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-slate-700" />
          <div className="w-3 h-3 rounded-full bg-slate-700" />
          <div className="w-3 h-3 rounded-full bg-slate-700" />
          <div className="flex-1 flex justify-center">
              <div className="text-xs text-slate-500 font-mono">
                <ScrambledText text="Corpo VPN — Dashboard" speed={30} />
              </div>
          </div>
        </div>
        {/* App body */}
        <div className="flex bg-slate-950 relative overflow-hidden">
          {/* Sidebar */}
          <div className="w-16 bg-slate-900/80 border-r border-white/5 flex flex-col items-center gap-4 py-5 z-10 relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            {['⬜','⬜','⬜','⬜'].map((_, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center
                ${i === 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'}`}>
                <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-blue-400' : 'bg-slate-600'}`} />
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-5 z-10 relative">
            {/* Connect ring mock */}
            <div className="flex flex-col items-center mb-6 mt-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                  style={{ background: 'conic-gradient(#10b981 100%, rgba(255,255,255,0.05) 0%)' }} />
                <div className="absolute inset-[3px] rounded-full bg-slate-950" />
                <div className="relative z-10 flex flex-col items-center">
                  <Shield size={20} className="text-emerald-400 mb-1" />
                  <span className="text-xs font-bold text-emerald-400">
                    <ShinyText baseColor="#10b981" shineColor="#ffffff" speed="3s">Connected</ShinyText>
                  </span>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Internal IP', value: '10.200.5.84',    color: 'text-blue-400'  },
                { label: 'Ping',      value: '18 ms',          color: 'text-emerald-400' },
                { label: 'Tunnel',    value: 'WireGuard',    color: 'text-slate-300'   },
                { label: 'Encryption', value: 'AES-256-GCM',   color: 'text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 border border-white/5 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className={`text-sm font-semibold font-mono ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full blur-3xl bg-blue-500/10 z-0" />
    </div>
  )
}

function AnimatedCard({ children, className = "" }) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(56,189,248,0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function FeatureCard({ feature }) {
  return (
    <AnimatedCard className="h-full">
      <div className="text-3xl mb-4 text-blue-400">{feature.icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
    </AnimatedCard>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#030712]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Corpo VPN</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {['Features', 'Architecture', 'Security'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="text-slate-400 hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/yahiasaad392/corpo-vpn" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <Github size={18} />
            <span className="hidden sm:inline">GitHub Repo</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-32 text-center overflow-hidden z-10">
        
        {/* Subtle Orb Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] -z-10 opacity-30 pointer-events-none">
          <Orb hue={210} hoverIntensity={0.2} rotateOnHover={false} backgroundColor="transparent" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium mb-8 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-300">Enterprise Grade Security • Zero-Trust Ready</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white leading-tight relative z-10">
          Zero-Trust Security for <br className="hidden md:block" />
          <GradientText colors={['#3b82f6', '#8b5cf6', '#3b82f6']} className="inline-block mt-2">
            The Modern Enterprise.
          </GradientText>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light relative z-10">
          Corpo VPN replaces outdated infrastructure with intelligent, identity-aware secure networking. Powered by blazing fast WireGuard tunnels and real-time device compliance.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <Magnet strength={0.1}>
            <a 
              href="https://github.com/yahiasaad392/corpo-vpn/releases/download/v1.0.0/Corpo.VPN.Setup.1.0.0.exe"
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              <Monitor size={20} />
              Download for Windows
            </a>
          </Magnet>
          <a 
            href="https://github.com/yahiasaad392/corpo-vpn"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <Github size={20} />
            View Source Code
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500 relative z-10 font-medium">Requires Windows 10/11 (64-bit). Version 1.0.0 is live.</p>

        {/* App Mockup */}
        <ScrollReveal delay={200}>
          <DashboardMockup />
        </ScrollReveal>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24 bg-slate-950 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Corpo VPN?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Industry-leading secure access built from the ground up to protect the modern distributed workforce.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appFeatures.map((f, idx) => (
              <ScrollReveal key={f.title} delay={idx * 100}>
                <FeatureCard feature={f} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="px-6 py-24 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Development Workflow</h2>
            <p className="text-slate-400 text-lg">A rigorous engineering approach designed for zero-trust security and high performance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { step: '01', title: 'Architecture & Cryptography', desc: 'Designed the zero-trust framework, established WireGuard cryptographic foundations, and secured Supabase OTP flows.' },
              { step: '02', title: 'Gateway Infrastructure', desc: 'Deployed automated VPS servers equipped with dynamic IP routing, IPTables masquerading, and auto-scaling peer management.' },
              { step: '03', title: 'Native Client Build', desc: 'Developed the high-performance Electron application for native OS integration with built-in compliance scanning.' },
              { step: '04', title: 'Security & Persistence', desc: 'Implemented strict penetration tests and created immutable, 7-day persistent system audit logs on PostgreSQL.' }
            ].map((item, idx) => (
              <ScrollReveal key={item.step} delay={idx * 100}>
                <div className="flex gap-6 items-start p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60">
                  <div className="text-4xl font-black text-slate-800 select-none">
                     <ScrambledText text={item.step} speed={50} scrambleChars="01" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="px-6 py-16 bg-blue-600 relative z-10 text-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 100, suffix: '+',   label: 'Enterprise Deployments' },
            { value: 99.99, suffix: '%', decimals: 2, label: 'Gateway Uptime' },
            { value: 24, suffix: '/7',   label: 'Security Operations' },
            { value: 1, prefix: '< ', suffix: 'ms',  label: 'Tunnel Latency' },
          ].map(({ value, prefix, suffix, decimals, label }) => (
            <div key={label}>
              <div className="text-4xl font-black mb-2 flex justify-center items-center drop-shadow-sm">
                {prefix && <span>{prefix}</span>}
                <CountUp from={0} to={value} decimals={decimals || 0} duration={2000} />
                {suffix && <span>{suffix}</span>}
              </div>
              <div className="text-sm text-blue-100 font-medium">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-[#02050a] border-t border-slate-900 z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-blue-500" />
            <span className="font-bold text-white text-lg">Corpo VPN</span>
          </div>
          <p className="text-slate-500 text-sm">
             © 2026 Corpo VPN Graduation Project. Built for enterprise.
          </p>
          <div className="flex gap-6">
            <a href="https://github.com/yahiasaad392/corpo-vpn" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
               <Github size={20} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
