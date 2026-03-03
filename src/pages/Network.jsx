import React, { useState } from 'react'
import { Search, Share2, Globe, Database, Server, Lock, ExternalLink, ShieldCheck, AlertTriangle, Info } from 'lucide-react'
import { corporateResources } from '../data/mockData'

export default function Network() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredResources = corporateResources.filter(res =>
    res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getIcon = (type) => {
    switch (type) {
      case 'Web': return Globe
      case 'SMB': return Server
      case 'SQL': return Database
      case 'Admin': return Lock
      default: return Share2
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">HQ Network Resources</h1>
          <p className="text-slate-500 font-medium">Internal endpoints authorized for your role.</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search internal resources..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => {
          const Icon = getIcon(res.type)
          return (
            <div key={res.id} className="glass-card p-5 group hover:border-cyan-500/30 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                   res.status === 'Available' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="flex items-center gap-2">
                   {res.status === 'Available' ? (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck size={10} /> Ready
                     </div>
                   ) : (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <AlertTriangle size={10} /> {res.status}
                     </div>
                   )}
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{res.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono">{res.type}</span>
                   <span className="text-[11px] text-slate-600 font-medium">{res.category}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Internal Access Only</span>
                 <ExternalLink size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 mt-8">
         <Info className="text-amber-500 mt-1 shrink-0" size={20} />
         <p className="text-xs text-amber-200/70 leading-relaxed">
            <strong className="text-amber-400">Policy Reminder:</strong> Access to internal HQ resources is monitored and logged in accordance with Corporate Security Policy 12-B. Ensure your VPN session is protected before attempting to connect to <strong>Admin Only</strong> tools.
         </p>
      </div>
    </div>
  )
}
