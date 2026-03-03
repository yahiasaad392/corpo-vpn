export default function LogEntry({ log, index }) {
  const levelStyles = {
    info:    { dot: 'bg-blue-400',   badge: 'status-badge-info',    label: 'INFO' },
    warning: { dot: 'bg-yellow-400', badge: 'status-badge-warning', label: 'WARN' },
    error:   { dot: 'bg-red-400',    badge: 'status-badge-error',   label: 'ERR ' },
    success: { dot: 'bg-neon-green', badge: 'status-badge-success', label: ' OK ' },
  }

  const s = levelStyles[log.level] || levelStyles.info

  return (
    <div
      className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/3 transition-colors duration-150 animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 400)}ms`, animationFillMode: 'both' }}
    >
      {/* Dot */}
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />

      {/* Time */}
      <span className="text-xs font-mono text-slate-500 flex-shrink-0 mt-0.5 w-16">{log.time}</span>

      {/* Badge */}
      <span className={`${s.badge} flex-shrink-0 font-mono mt-0.5`}>{s.label}</span>

      {/* Message */}
      <span className="text-xs font-mono text-slate-300 leading-relaxed">{log.message}</span>
    </div>
  )
}
