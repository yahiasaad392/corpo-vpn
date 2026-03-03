import { useState, useEffect, useRef } from 'react'
import { Trash2, Pause, Play } from 'lucide-react'
import LogEntry from '../components/LogEntry'
import { initialLogs, liveLogs } from '../data/mockData'

const TABS = ['All', 'Info', 'Warning', 'Error', 'Success']

let logId = initialLogs.length + 1
let liveIdx = 0

export default function Logs() {
  const [logs, setLogs] = useState(initialLogs)
  const [filter, setFilter] = useState('All')
  const [paused, setPaused] = useState(false)
  const bottomRef = useRef(null)

  // Live log simulator
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      const template = liveLogs[liveIdx % liveLogs.length]
      liveIdx++
      setLogs(prev => [...prev, { ...template, id: logId++, time }])
    }, 2200)
    return () => clearInterval(interval)
  }, [paused])

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, paused])

  const filtered = filter === 'All'
    ? logs
    : logs.filter(l => l.level === filter.toLowerCase())

  const counts = {
    info:    logs.filter(l => l.level === 'info').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error:   logs.filter(l => l.level === 'error').length,
    success: logs.filter(l => l.level === 'success').length,
  }

  return (
    <div className="h-full flex flex-col px-8 py-8">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white">Connection Logs</h1>
            <p className="text-sm text-slate-500 mt-0.5">{logs.length} entries · Live updating</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPaused(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm
                text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 border border-white/8"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm
                text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/20"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
          {[
            { label: 'Info',    count: counts.info,    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
            { label: 'Success', count: counts.success, color: 'text-neon-green', bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
            { label: 'Warning', count: counts.warning, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            { label: 'Error',   count: counts.error,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
          ].map(({ label, count, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl px-4 py-3`}>
              <div className={`text-xl font-bold font-mono ${color}`}>{count}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200
                ${filter === t
                  ? 'bg-cyan-500/20 text-neon-cyan border border-cyan-500/25'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Log Feed */}
        <div className="flex-1 overflow-y-auto glass-card p-3 font-mono">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 mb-3 pb-3 border-b border-white/5">
            <div className={`w-2 h-2 rounded-full ${paused ? 'bg-yellow-400' : 'bg-neon-green animate-pulse'}`} />
            <span className="text-xs text-slate-600">{paused ? 'PAUSED' : 'LIVE'}</span>
            <span className="ml-auto text-xs text-slate-700">{filtered.length} entries shown</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
              No {filter.toLowerCase()} entries
            </div>
          ) : (
            filtered.map((log, i) => <LogEntry key={log.id} log={log} index={i} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
