import { useState, useMemo } from 'react'
import { Search, Zap, MapPin } from 'lucide-react'
import ServerCard from '../components/ServerCard'
import { mockServers } from '../data/mockData'

const TABS = ['All Servers', 'Favorites', 'Recommended']

export default function Servers() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(1)
  const [tab, setTab] = useState('All Servers')

  const filtered = useMemo(() => {
    let list = mockServers
    if (tab === 'Favorites') list = list.filter(s => s.favorite)
    if (tab === 'Recommended') list = list.filter(s => s.ping < 40)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(s =>
        s.country.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      )
    }
    return list
  }, [query, tab])

  const selected = mockServers.find(s => s.id === selectedId)

  const handleBestServer = () => {
    const best = mockServers.reduce((a, b) => a.ping < b.ping ? a : b)
    setSelectedId(best.id)
  }

  return (
    <div className="h-full flex flex-col px-8 py-8">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white">Server Selection</h1>
            <p className="text-sm text-slate-500 mt-0.5">{mockServers.length} servers in 20 countries</p>
          </div>
          <button
            onClick={handleBestServer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 
              border border-cyan-500/25 text-cyan-400 text-sm font-medium
              hover:from-cyan-500/25 hover:to-blue-500/25 hover:border-cyan-500/40 transition-all duration-200"
          >
            <Zap size={16} />
            Best Server
          </button>
        </div>

        {/* Current Selection Banner */}
        {selected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/8 border border-cyan-500/20 mb-4 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse flex-shrink-0" />
            <MapPin size={14} className="text-cyan-400" />
            <span className="text-sm text-cyan-300">
              Active: <span className="font-semibold">{selected.flag} {selected.country} · {selected.city}</span>
            </span>
            <span className="ml-auto text-xs font-mono text-cyan-500">{selected.ping} ms</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4 flex-shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search country or city..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4
              text-sm text-white placeholder-slate-500 
              focus:outline-none focus:border-cyan-500/40 focus:bg-white/8 focus:shadow-glow-cyan
              transition-all duration-200"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200
                ${tab === t
                  ? 'bg-cyan-500/20 text-neon-cyan border border-cyan-500/25'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Column Headers */}
        <div className="flex items-center gap-4 px-4 mb-1 flex-shrink-0">
          <div className="w-8" />
          <div className="flex-1 text-xs text-slate-600 uppercase tracking-wider">Country</div>
          <div className="hidden sm:block text-xs text-slate-600 uppercase tracking-wider w-32">Load</div>
          <div className="text-xs text-slate-600 uppercase tracking-wider w-16 text-right">Ping</div>
          <div className="w-4" />
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto glass-card p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600">
              <Search size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No servers found</p>
            </div>
          ) : (
            filtered.map(server => (
              <ServerCard
                key={server.id}
                server={server}
                isSelected={server.id === selectedId}
                onSelect={s => setSelectedId(s.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
