export default function StatusRing({ status, children }) {
  // status: 'disconnected' | 'connecting' | 'connected'
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  const ringColor = isConnected
    ? '#00ff88'
    : isConnecting
    ? '#00f5ff'
    : '#475569'

  const glowColor = isConnected
    ? 'rgba(0,255,136,0.4)'
    : isConnecting
    ? 'rgba(0,245,255,0.4)'
    : 'transparent'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Pulse rings (connected only) */}
      {isConnected && (
        <>
          <div className="absolute inset-0 rounded-full animate-pulse-ring opacity-0"
            style={{ border: `2px solid ${ringColor}` }} />
          <div className="absolute inset-0 rounded-full animate-pulse-ring opacity-0"
            style={{ border: `2px solid ${ringColor}`, animationDelay: '0.8s' }} />
        </>
      )}

      {/* Outer decorative track */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${ringColor} ${isConnected ? '100%' : isConnecting ? '60%' : '0%'}, rgba(255,255,255,0.05) 0%)`,
          padding: '3px',
          transition: 'all 1.2s ease',
          filter: isConnected || isConnecting ? `drop-shadow(0 0 16px ${glowColor})` : 'none',
        }}
      >
        <div className="w-full h-full rounded-full bg-dark-800" />
      </div>

      {/* Spinning arcs (connecting state) */}
      {isConnecting && (
        <>
          <svg className="absolute inset-0 animate-spin-slow" viewBox="0 0 240 240" style={{ width: 240, height: 240 }}>
            <circle
              cx="120" cy="120" r="112"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="3"
              strokeDasharray="80 400"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity="0" />
                <stop offset="100%" stopColor="#00f5ff" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="absolute inset-0 animate-spin-reverse" viewBox="0 0 240 240" style={{ width: 240, height: 240 }}>
            <circle
              cx="120" cy="120" r="112"
              fill="none"
              stroke="url(#grad2)"
              strokeWidth="2"
              strokeDasharray="50 440"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#bf00ff" stopOpacity="0" />
                <stop offset="100%" stopColor="#bf00ff" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </>
      )}

      {/* Inner glow */}
      <div
        className="absolute rounded-full transition-all duration-1000"
        style={{
          inset: '20px',
          background: isConnected
            ? 'radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)'
            : isConnecting
            ? 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(71,85,105,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
