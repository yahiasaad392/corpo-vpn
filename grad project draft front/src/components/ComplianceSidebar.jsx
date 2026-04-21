import React from 'react'
import { Shield, ShieldCheck, ShieldX, ShieldAlert, Info, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { ALL_CHECKS_MAP } from '../data/complianceChecks'

export default function ComplianceSidebar({ isVisible, results, isScanning, onRetry, policy, isAdmin }) {
  if (!isVisible && !isScanning) return null

  // If admin, show nothing (admins bypass compliance)
  if (isAdmin) return null

  // Build check lists from policy
  const criticalIds = policy?.critical_checks || []
  const warningIds = policy?.warning_checks || []
  const infoIds = policy?.info_checks || []

  const buildChecks = (ids, severity) => {
    return ids.map(id => {
      const meta = ALL_CHECKS_MAP[id] || { label: id }
      const result = results?.[id]
      return {
        id,
        label: meta.label,
        pass: result?.pass,
        detail: result?.detail || result?.label || (result?.pass ? 'Passed' : 'Failed'),
        severity,
      }
    })
  }

  const criticalChecks = buildChecks(criticalIds, 'critical')
  const warningChecks = buildChecks(warningIds, 'warning')
  const infoChecks = buildChecks(infoIds, 'info')

  const criticalFails = criticalChecks.filter(c => results && !c.pass).length
  const warningFails = warningChecks.filter(c => results && !c.pass).length
  const hasBlockingFails = criticalFails > 0

  const sections = [
    { title: 'Critical', icon: Shield, checks: criticalChecks, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
    { title: 'Warning', icon: ShieldAlert, checks: warningChecks, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
    { title: 'Informational', icon: Info, checks: infoChecks, color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)' },
  ]

  return (
    <div className={`fixed right-0 top-0 h-full w-80 bg-[#060818]/95 backdrop-blur-xl border-l border-white/10 z-40 transform transition-transform duration-500 ease-out shadow-[-20px_0_50px_rgba(0,0,0,0.5)] ${isVisible || isScanning ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <ShieldCheck size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">Compliance Scan</h3>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Zero-Trust Security</p>
          </div>
        </div>

        {/* Overall status banner */}
        {!isScanning && results && (
          <div className={`mb-4 p-3 rounded-xl border text-center ${
            hasBlockingFails
              ? 'bg-red-500/10 border-red-500/20'
              : warningFails > 0
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${
              hasBlockingFails ? 'text-red-400' : warningFails > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {hasBlockingFails ? '⛔ NON-COMPLIANT — BLOCKED' : warningFails > 0 ? '⚠️ WARNINGS DETECTED' : '✅ FULLY COMPLIANT'}
            </p>
          </div>
        )}

        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {sections.map(section => {
            if (section.checks.length === 0) return null
            const SectionIcon = section.icon

            return (
              <div key={section.title} style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${section.border}` }}>
                  <SectionIcon size={13} style={{ color: section.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: section.color }}>
                    {section.title}
                  </span>
                  <span style={{ fontSize: 9, color: section.color, opacity: 0.7, marginLeft: 'auto', fontWeight: 700 }}>
                    {section.checks.filter(c => results && c.pass).length}/{section.checks.length}
                  </span>
                </div>

                <div style={{ padding: '6px 8px' }}>
                  {section.checks.map(check => {
                    const isDone = results && !isScanning
                    const isPassing = check.pass

                    return (
                      <div key={check.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderRadius: 8, marginBottom: 2,
                        background: isScanning ? 'transparent' : isPassing ? 'rgba(34,197,94,0.04)' : section.title === 'Informational' ? 'rgba(59,130,246,0.04)' : 'rgba(239,68,68,0.04)',
                      }}>
                        {isScanning ? (
                          <Loader2 size={12} className="text-cyan-500 animate-spin" style={{ flexShrink: 0 }} />
                        ) : isPassing ? (
                          <CheckCircle size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                        ) : section.title === 'Informational' ? (
                          <Info size={13} style={{ color: '#60a5fa', flexShrink: 0 }} />
                        ) : (
                          <XCircle size={13} style={{ color: section.color, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: 'white', margin: 0, lineHeight: 1.3 }}>{check.label}</p>
                          {isDone && (
                            <p style={{ fontSize: 9, color: isPassing ? '#4ade8080' : section.title === 'Informational' ? '#60a5fa80' : `${section.color}80`, margin: '1px 0 0', lineHeight: 1.2 }}>
                              {typeof check.detail === 'string' ? check.detail : (isPassing ? 'OK' : 'Failed')}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Blocking message + retry */}
        {!isScanning && results && hasBlockingFails && (
          <div className="mt-6 space-y-3">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <p className="text-[10px] text-red-300 leading-normal">
                Your device is <span className="font-bold">non-compliant</span>. Critical check failures block VPN access. Resolve issues and scan again.
              </p>
            </div>
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all"
            >
              Scan Again
            </button>
          </div>
        )}

        {/* Warning-only message */}
        {!isScanning && results && !hasBlockingFails && warningFails > 0 && (
          <div className="mt-6">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-300 leading-normal">
                <span className="font-bold">{warningFails} warning(s)</span> detected. VPN access allowed, but your admins have been notified.
              </p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 animate-pulse font-medium">Querying System Config...</p>
          </div>
        )}
      </div>
    </div>
  )
}
