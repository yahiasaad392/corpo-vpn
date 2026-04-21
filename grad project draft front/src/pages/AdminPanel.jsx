import { useState, useEffect } from 'react'
import { Crown, Users, Shield, UserPlus, UserMinus, Search, RefreshCw } from 'lucide-react'

const API = 'http://127.0.0.1:3001/api/auth'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoteLoading, setPromoteLoading] = useState(false)

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('vpn_user')) } catch { return null } })()

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/users?callerEmail=${encodeURIComponent(currentUser?.email)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load users')
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handlePromote = async (targetEmail) => {
    setError(''); setSuccess('')
    setPromoteLoading(true)
    try {
      const res = await fetch(`${API}/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerEmail: currentUser?.email, targetEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to promote')
      setSuccess(data.message)
      setPromoteEmail('')
      fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setPromoteLoading(false)
    }
  }

  const handleDemote = async (targetEmail) => {
    setError(''); setSuccess('')
    try {
      const res = await fetch(`${API}/remove-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerEmail: currentUser?.email, targetEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to demote')
      setSuccess(data.message)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )
  const adminCount = users.filter(u => u.role === 'admin').length
  const userCount = users.filter(u => u.role === 'user').length

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Crown className="text-amber-400 w-7 h-7" />
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-sm text-slate-500">Manage users and admin roles</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Users size={22} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{users.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Users</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Crown size={22} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{adminCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Admins</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
              <Shield size={22} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{userCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Regular Users</p>
            </div>
          </div>
        </div>

        {/* Quick Promote */}
        <div className="glass-card p-6 mb-6 border-amber-500/10">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-amber-400" />
            Promote User to Admin
          </h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={promoteEmail}
              onChange={e => setPromoteEmail(e.target.value)}
              placeholder="Enter email to promote..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
            />
            <button
              onClick={() => handlePromote(promoteEmail)}
              disabled={!promoteEmail.trim() || promoteLoading}
              className="px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {promoteLoading ? 'Promoting...' : 'Promote'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs mb-4 animate-fade-in">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4 animate-fade-in">
            ✅ {success}
          </div>
        )}

        {/* User List */}
        <div className="glass-card overflow-hidden">
          {/* Search + Refresh */}
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
              />
            </div>
            <button
              onClick={fetchUsers}
              className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_140px_100px] px-6 py-3 border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <span>Email</span>
            <span className="text-center">Role</span>
            <span className="text-center">Joined</span>
            <span className="text-center">Action</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No users found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(user => (
                <div key={user.id} className="grid grid-cols-[1fr_100px_140px_100px] px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">
                  {/* Email */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      user.role === 'admin' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800 border border-white/10'
                    }`}>
                      {user.role === 'admin'
                        ? <Crown size={12} className="text-amber-400" />
                        : <Shield size={12} className="text-slate-500" />
                      }
                    </div>
                    <span className="text-sm text-white truncate font-mono">{user.email}</span>
                  </div>

                  {/* Role badge */}
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700/50 text-slate-400 border border-white/5'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="text-center text-xs text-slate-500 font-mono">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="text-center">
                    {user.email === 'ys5313944@gmail.com' ? (
                      <span className="text-[10px] text-amber-500/50 font-bold">ROOT</span>
                    ) : user.email === currentUser?.email ? (
                      <span className="text-[10px] text-slate-600">You</span>
                    ) : user.role === 'admin' ? (
                      <button
                        onClick={() => handleDemote(user.email)}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePromote(user.email)}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                      >
                        Promote
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-slate-700 mt-6">
          Root admin (ys5313944@gmail.com) cannot be demoted. You cannot demote yourself.
        </p>
      </div>
    </div>
  )
}
