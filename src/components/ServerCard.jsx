import { useState } from 'react'
import { Star } from 'lucide-react'

function LoadBar({ value }) {
  const color =
    value < 40 ? 'bg-neon-green' :
    value < 70 ? 'bg-yellow-400' :
    'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8">{value}%</span>
    </div>
  )
}

export default function ServerCard({ server, onSelect, isSelected }) {
  const [fav, setFav] = useState(server.favorite)

  const pingColor =
    server.ping < 50 ? 'text-neon-green' :
    server.ping < 120 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div
      onClick={() => onSelect && onSelect(server)}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group
        ${isSelected
          ? 'bg-cyan-500/10 border border-cyan-500/25 shadow-glow-cyan'
          : 'hover:bg-white/5 border border-transparent hover:border-white/8'
        }`}
    >
      {/* Flag */}
      <div className="text-2xl w-8 text-center flex-shrink-0">{server.flag}</div>

      {/* Country/City */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-neon-cyan' : 'text-white group-hover:text-white'}`}>
          {server.country}
        </div>
        <div className="text-xs text-slate-500 truncate">{server.city}</div>
      </div>

      {/* Load */}
      <div className="hidden sm:block">
        <LoadBar value={server.load} />
      </div>

      {/* Ping */}
      <div className={`text-sm font-mono font-semibold w-16 text-right flex-shrink-0 ${pingColor}`}>
        {server.ping} ms
      </div>

      {/* Favorite */}
      <button
        onClick={e => { e.stopPropagation(); setFav(v => !v) }}
        className={`flex-shrink-0 transition-all duration-200 hover:scale-125
          ${fav ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
      >
        <Star size={16} fill={fav ? 'currentColor' : 'none'} />
      </button>

      {/* Selected Dot */}
      {isSelected && (
        <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-glow-cyan flex-shrink-0" />
      )}
    </div>
  )
}
