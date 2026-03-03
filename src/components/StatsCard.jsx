import React from 'react'

export default function StatsCard({ label, value, icon: Icon, trend }) {
  return (
    <div className="glass-card p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
      {/* Subtle glow background */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-colors" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-cyan-500/20 transition-colors">
          <Icon className="text-slate-400 group-hover:text-cyan-400 transition-colors" size={20} />
        </div>
        {trend && (
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {trend}
          </div>
        )}
      </div>
      
      <div className="mt-5 relative z-10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </p>
        <h3 className="text-xl font-mono font-black text-white tracking-tight group-hover:text-cyan-100 transition-colors truncate">
          {value}
        </h3>
      </div>
    </div>
  )
}
