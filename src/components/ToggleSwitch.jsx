export default function ToggleSwitch({ enabled, onToggle, label, description, icon }) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl glass-card-sm hover:bg-white/8 transition-all duration-200 cursor-pointer group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-300
            ${enabled ? 'bg-cyan-500/15 border border-cyan-500/25' : 'bg-white/5 border border-white/8'}`}>
            {icon}
          </div>
        )}
        <div>
          <div className={`text-sm font-medium transition-colors duration-200 ${enabled ? 'text-white' : 'text-slate-400'}`}>
            {label}
          </div>
          {description && (
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          )}
        </div>
      </div>

      {/* Toggle Track */}
      <div
        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 
          ${enabled
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-glow-cyan'
            : 'bg-white/10 border border-white/15'
          }`}
      >
        {/* Toggle Thumb */}
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow-lg
            ${enabled
              ? 'left-6 bg-white'
              : 'left-0.5 bg-slate-400'
            }`}
        />
      </div>
    </div>
  )
}
