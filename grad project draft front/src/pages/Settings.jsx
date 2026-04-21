import { useState, useEffect } from 'react'
import ToggleSwitch from '../components/ToggleSwitch'
import { ChevronDown, Save, CheckCircle, Key, Wifi, AlertTriangle, Crown, UserPlus, UserMinus, Trash2 } from 'lucide-react'

const API = 'http://127.0.0.1:3001/api/auth'

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
  // Role check
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('vpn_user')) } catch { return null } })()
  const isAdmin = currentUser?.role === 'admin'

  // Admin management state
  const [adminEmail, setAdminEmail] = useState('')
  const [admins, setAdmins] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API}/admins?callerEmail=${encodeURIComponent(currentUser?.email)}`)
      const data = await res.json()
      if (res.ok) setAdmins(data)
    } catch {}
  }

  useEffect(() => { if (isAdmin) fetchAdmins() }, [isAdmin])

  const handleAddAdmin = async () => {
    setAdminError(''); setAdminSuccess('')
    if (!adminEmail.trim()) return
    setAdminLoading(true)
    try {
      const res = await fetch(`${API}/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerEmail: currentUser?.email, targetEmail: adminEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setAdminSuccess(data.message)
      setAdminEmail('')
      fetchAdmins()
    } catch (err) { setAdminError(err.message) }
    finally { setAdminLoading(false) }
  }

  const handleRemoveAdmin = async (email) => {
    setAdminError(''); setAdminSuccess('')
    try {
      const res = await fetch(`${API}/remove-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerEmail: currentUser?.email, targetEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setAdminSuccess(data.message)
      fetchAdmins()
    } catch (err) { setAdminError(err.message) }
  }

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

  // WireGuard config state
  const [wgPrivateKey, setWgPrivateKey] = useState('')
  const [wgClientIp, setWgClientIp] = useState('10.10.0.3')
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState(null)

  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')

  const validatePassword = (pass, userEmail) => {
    const exemptEmails = ['ys5313944@gmail.com', 'yahiasaad1904@gmail.com'];
    if (exemptEmails.includes(userEmail)) return true;
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(pass);
  };

  const handleChangePassword = async () => {
    setPassError(''); setPassSuccess('');
    
    const userStr = localStorage.getItem('vpn_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.email) throw new Error('User not found. Please log in again.');

    if (!validatePassword(newPassword, user.email)) {
      setPassError('New password must be 8+ chars, have upper/lower/special characters');
      return;
    }

    setPassLoading(true);
    try {

      const res = await fetch('http://127.0.0.1:3001/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Change failed');

      setPassSuccess('Password updated successfully!');
      setOldPassword(''); setNewPassword('');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const isElectron = !!window.electronAPI?.vpnSaveConfig

  // Load saved config on mount
  useEffect(() => {
    if (isElectron && window.electronAPI?.vpnLoadConfig) {
      window.electronAPI.vpnLoadConfig().then(config => {
        if (config) {
          if (config.privateKey) setWgPrivateKey(config.privateKey)
          if (config.clientIp)   setWgClientIp(config.clientIp)
        }
      })
    }
  }, [isElectron])

  const toggle = key => setSettings(s => ({ ...s, [key]: !s[key] }))

  const handleSaveWgConfig = async () => {
    setConfigError(null)
    setConfigSaved(false)

    if (!wgPrivateKey.trim()) {
      setConfigError('Private key is required')
      return
    }
    if (!wgClientIp.trim()) {
      setConfigError('Client IP is required')
      return
    }

    if (isElectron) {
      const res = await window.electronAPI.vpnSaveConfig({
        privateKey: wgPrivateKey.trim(),
        clientIp: wgClientIp.trim(),
      })
      if (res.success) {
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      } else {
        setConfigError(res.error)
      }
    } else {
      // Browser mode — just show success
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Application Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your Corpo VPN experience</p>
        </div>

        <div className="space-y-8">

          {/* WIREGUARD CONFIG — NEW */}
          <div className="glass-card p-6 border-cyan-500/20">
            <SectionHeader title="🔑 WireGuard Configuration" description="Enter your client credentials to connect to the VPN server" />
            
            <div className="space-y-4">
              {/* Server info (read-only) */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Server Details (pre-configured)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Endpoint:</span> <span className="text-cyan-400 font-mono">80.65.211.27:51820</span></div>
                  <div><span className="text-slate-500">Protocol:</span> <span className="text-cyan-400 font-mono">WireGuard</span></div>
                  <div><span className="text-slate-500">DNS:</span> <span className="text-cyan-400 font-mono">1.1.1.1</span></div>
                  <div><span className="text-slate-500">Routing:</span> <span className="text-cyan-400 font-mono">0.0.0.0/0 (all traffic)</span></div>
                </div>
              </div>

              {/* Client Private Key */}
              <div>
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1.5">
                  <Key size={12} className="text-cyan-500" />
                  Client Private Key
                </label>
                <input
                  type="password"
                  value={wgPrivateKey}
                  onChange={e => setWgPrivateKey(e.target.value)}
                  placeholder="Paste your WireGuard private key..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono 
                    placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-[10px] text-slate-600 mt-1">Generated on the server with `wg genkey`. Never share this key.</p>
              </div>

              {/* Client IP */}
              <div>
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1.5">
                  <Wifi size={12} className="text-cyan-500" />
                  Client VPN IP Address
                </label>
                <input
                  type="text"
                  value={wgClientIp}
                  onChange={e => setWgClientIp(e.target.value)}
                  placeholder="e.g., 10.10.0.3"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono 
                    placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-[10px] text-slate-600 mt-1">Assigned by your server admin. Must be in the 10.10.0.2 - 10.10.0.254 range.</p>
              </div>

              {/* Error */}
              {configError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-xs text-red-300">{configError}</span>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveWgConfig}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300
                  ${configSaved 
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(0,245,255,0.2)]'
                  }`}
              >
                {configSaved ? (
                  <><CheckCircle size={16} /> Configuration Saved!</>
                ) : (
                  <><Save size={16} /> Save WireGuard Config</>
                )}
              </button>
            </div>
          </div>

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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/25">Active</span>
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

          {/* SECURITY: CHANGE PASSWORD */}
          <div className="glass-card p-6 border-purple-500/20">
            <SectionHeader title="🛡️ Account Security" description="Update your account password" />
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="8+ chars, upper, lower, special"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40"
                />
              </div>

              {passError && <p className="text-xs text-red-400">{passError}</p>}
              {passSuccess && <p className="text-xs text-emerald-400">{passSuccess}</p>}

              <button
                onClick={handleChangePassword}
                disabled={passLoading || !newPassword || !oldPassword}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>

          {/* PRIVACY */}
          <div className="glass-card p-6">
            <SectionHeader title="Privacy & Analytics" description="Control what data Corpo VPN collects" />
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

          {/* ADMIN MANAGEMENT — Admin Only */}
          {isAdmin && (
          <div className="glass-card p-6 border-amber-500/20">
            <SectionHeader title="👑 Admin Management" description="Promote or demote admins (admin only)" />
            
            {/* Add admin */}
            <div className="flex gap-3 mb-4">
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="Enter email to promote to admin..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
              />
              <button
                onClick={handleAddAdmin}
                disabled={!adminEmail.trim() || adminLoading}
                className="px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <UserPlus size={14} />
                {adminLoading ? 'Adding...' : 'Add Admin'}
              </button>
            </div>

            {adminError && <p className="text-xs text-red-400 mb-3">❌ {adminError}</p>}
            {adminSuccess && <p className="text-xs text-emerald-400 mb-3">✅ {adminSuccess}</p>}

            {/* Admin list */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Current Admins</p>
              {admins.map(a => (
                <div key={a.email} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-amber-400" />
                    <span className="text-sm text-white font-mono">{a.email}</span>
                    {a.email === 'ys5313944@gmail.com' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">ROOT</span>
                    )}
                  </div>
                  {a.email !== 'ys5313944@gmail.com' && a.email !== currentUser?.email && (
                    <button
                      onClick={() => handleRemoveAdmin(a.email)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1"
                    >
                      <UserMinus size={12} /> Demote
                    </button>
                  )}
                </div>
              ))}
              {admins.length === 0 && <p className="text-xs text-slate-600">Loading admins...</p>}
            </div>
          </div>
          )}

          {/* Version info */}
          <div className="text-center text-xs text-slate-700 pb-4">
             Corpo VPN v4.2.0-stable · Build 2026.03.11 · Enterprise License
          </div>
        </div>
      </div>
    </div>
  )
}
