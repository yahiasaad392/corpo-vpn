import { useState } from 'react'
import ToggleSwitch from '../components/ToggleSwitch'
import { ChevronDown } from 'lucide-react'

const PROTOCOLS = ['WireGuard', 'OpenVPN (UDP)', 'OpenVPN (TCP)', 'IKEv2']

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useState({
    autoConnect:     true,
    killSwitch:      true,
    splitTunneling:  false,
    dnsLeak:         true,
    notifications:   true,
    startOnBoot:     false,
    darkMode:        true,
    analytics:       false,
  })

  const [protocol, setProtocol] = useState('WireGuard')
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [startup, setStartup] = useState('minimize')

  const toggle = key => setSettings(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Application Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your Corpo VPN experience</p>
        </div>

        <div className="space-y-8">
          {/* CONNECTION */}
          <div className="glass-card p-6">
            <SectionHeader title="Connection" description="VPN connection behaviour settings" />
            <div className="space-y-2">
              <ToggleSwitch
                label="Auto Connect"
                description="Automatically connect VPN on app startup"
                icon="🔌"
                enabled={settings.autoConnect}
                onToggle={() => toggle('autoConnect')}
              />
              <ToggleSwitch
                label="Kill Switch"
                description="Block internet if VPN connection drops"
                icon="🛡️"
                enabled={settings.killSwitch}
                onToggle={() => toggle('killSwitch')}
              />
              <ToggleSwitch
                label="Split Tunneling"
                description="Route only selected apps through the VPN"
                icon="🔀"
                enabled={settings.splitTunneling}
                onToggle={() => toggle('splitTunneling')}
              />
              <ToggleSwitch
                label="DNS Leak Protection"
                description="Prevent DNS queries from leaking outside the tunnel"
                icon="🔐"
                enabled={settings.dnsLeak}
                onToggle={() => toggle('dnsLeak')}
              />
            </div>

            {/* Protocol Dropdown */}
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">VPN Protocol</div>
              <div className="relative">
                <button
                  onClick={() => setProtocolOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass-card-sm
                    hover:bg-white/8 transition-all duration-200 text-sm text-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neon-cyan">{protocol}</span>
                    {protocol === 'WireGuard' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/25">Recommended</span>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${protocolOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {protocolOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-10 glass-card border border-white/10 overflow-hidden rounded-xl">
                    {PROTOCOLS.map(p => (
                      <button
                        key={p}
                        onClick={() => { setProtocol(p); setProtocolOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150
                          ${p === protocol
                            ? 'text-neon-cyan bg-cyan-500/10'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* APPLICATION */}
          <div className="glass-card p-6">
            <SectionHeader title="Application" description="App behaviour and preferences" />
            <div className="space-y-2">
              <ToggleSwitch
                label="Launch on System Startup"
                description="Start Corpo VPN automatically with Windows/macOS"
                icon="🚀"
                enabled={settings.startOnBoot}
                onToggle={() => toggle('startOnBoot')}
              />
              <ToggleSwitch
                label="Notifications"
                description="Show desktop alerts for connection events"
                icon="🔔"
                enabled={settings.notifications}
                onToggle={() => toggle('notifications')}
              />
              <ToggleSwitch
                label="Dark Mode"
                description="Dark interface theme (always recommended)"
                icon="🌙"
                enabled={settings.darkMode}
                onToggle={() => toggle('darkMode')}
              />
            </div>

            {/* Startup behaviour radio */}
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-3 uppercase tracking-wider">On Window Close</div>
              <div className="flex gap-3">
                {[
                  { value: 'minimize', label: 'Minimize to Tray' },
                  { value: 'quit',     label: 'Quit App' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                      ${startup === value
                        ? 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-300'
                        : 'glass-card-sm text-slate-400 hover:bg-white/8'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${startup === value ? 'border-neon-cyan' : 'border-slate-600'}`}>
                      {startup === value && <div className="w-2 h-2 rounded-full bg-neon-cyan" />}
                    </div>
                    <input
                      type="radio"
                      value={value}
                      checked={startup === value}
                      onChange={() => setStartup(value)}
                      className="sr-only"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* PRIVACY */}
          <div className="glass-card p-6">
            <SectionHeader title="Privacy & Analytics" description="Control what data NexusVPN collects" />
            <div className="space-y-2">
              <ToggleSwitch
                label="Anonymous Usage Reports"
                description="Help improve Corpo VPN with diagnostic logs (no personal data)"
                icon="📊"
                enabled={settings.analytics}
                onToggle={() => toggle('analytics')}
              />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-green-500/8 border border-green-500/15">
              <p className="text-xs text-green-300">
                ✓ Corpo VPN enforces a strict zero-log policy. Your browsing activity is never recorded.
              </p>
            </div>
          </div>

          {/* Version info */}
          <div className="text-center text-xs text-slate-700 pb-4">
             Corpo VPN v4.2.0-stable · Build 2026.03.04 · Enterprise License
          </div>
        </div>
      </div>
    </div>
  )
}
