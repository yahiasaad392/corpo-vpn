import React, { useState, useEffect } from 'react'
import { Shield, ShieldAlert, Info, Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronRight, Users, Clock, Building2, Mail } from 'lucide-react'
import { COMPLIANCE_CHECKS } from '../data/complianceChecks'

const API = 'http://127.0.0.1:3001/api/policy'

export default function Policies() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('vpn_user')) } catch { return null } })()
  const callerEmail = currentUser?.email

  // ── State ──
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Form State ──
  const [companyName, setCompanyName] = useState('')
  const [maxUsers, setMaxUsers] = useState(10)
  const [sessionTimeout, setSessionTimeout] = useState(3600)
  const [emails, setEmails] = useState([''])
  const [criticalChecks, setCriticalChecks] = useState([])
  const [warningChecks, setWarningChecks] = useState([])
  const [infoChecks, setInfoChecks] = useState([])

  // ── Collapsible sections ──
  const [openSections, setOpenSections] = useState({ critical: true, warning: true, info: true })

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState('policies')

  // ── Load policies ──
  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/list?callerEmail=${encodeURIComponent(callerEmail)}`)
      const data = await res.json()
      if (Array.isArray(data)) setPolicies(data)
    } catch (err) {
      setError('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  // ── Generate email fields based on maxUsers ──
  useEffect(() => {
    if (!editingId) {
      const count = Math.max(1, parseInt(maxUsers) || 1)
      setEmails(prev => {
        if (prev.length < count) {
          return [...prev, ...Array(count - prev.length).fill('')]
        }
        return prev
      })
    }
  }, [maxUsers, editingId])

  const handleEmailChange = (idx, value) => {
    const updated = [...emails]
    updated[idx] = value
    setEmails(updated)
  }

  const addEmailField = () => {
    setEmails([...emails, ''])
  }

  const removeEmailField = (idx) => {
    if (emails.length <= 1) return
    setEmails(emails.filter((_, i) => i !== idx))
  }

  const toggleCheck = (setter, current, id) => {
    setter(current.includes(id) ? current.filter(c => c !== id) : [...current, id])
  }

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const resetForm = () => {
    setCompanyName('')
    setMaxUsers(10)
    setSessionTimeout(3600)
    setEmails([''])
    setCriticalChecks([])
    setWarningChecks([])
    setInfoChecks([])
    setEditingId(null)
  }

  const loadPolicyIntoForm = (policy) => {
    setCompanyName(policy.company_name)
    setMaxUsers(policy.max_users)
    setSessionTimeout(policy.session_timeout)
    setEmails(policy.emails && policy.emails.length > 0 ? policy.emails : [''])
    setCriticalChecks(policy.critical_checks || [])
    setWarningChecks(policy.warning_checks || [])
    setInfoChecks(policy.info_checks || [])
    setEditingId(policy.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Save / Update ──
  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    const filteredEmails = emails.filter(e => e.trim() !== '')
    if (!companyName.trim()) { setError('Company name is required'); setSaving(false); return }
    if (filteredEmails.length === 0) { setError('At least one email is required'); setSaving(false); return }

    const payload = {
      callerEmail,
      companyName: companyName.trim(),
      maxUsers: parseInt(maxUsers) || 10,
      sessionTimeout: parseInt(sessionTimeout) || 3600,
      emails: filteredEmails,
      criticalChecks,
      warningChecks,
      infoChecks,
    }

    try {
      let res
      if (editingId) {
        res = await fetch(`${API}/update/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Save failed')

      setSuccess(editingId ? 'Policy updated successfully!' : 'Policy created successfully!')
      resetForm()
      fetchPolicies()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return
    try {
      const res = await fetch(`${API}/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerEmail }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setSuccess('Policy deleted')
      fetchPolicies()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Section renderer ──
  const renderCheckSection = (title, icon, color, checks, selected, setSelected, sectionKey) => {
    const Icon = icon
    const isOpen = openSections[sectionKey]
    const colorMap = {
      red: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)', text: '#f87171', accent: '#ef4444', badge: 'rgba(239,68,68,0.15)' },
      amber: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', text: '#fbbf24', accent: '#f59e0b', badge: 'rgba(245,158,11,0.15)' },
      blue: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', text: '#60a5fa', accent: '#3b82f6', badge: 'rgba(59,130,246,0.15)' },
    }
    const c = colorMap[color]

    return (
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: c.text,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={16} />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 999, background: c.badge, color: c.text,
              fontWeight: 700,
            }}>
              {selected.length}/{checks.length}
            </span>
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isOpen && (
          <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {checks.map(check => {
              const isSelected = selected.includes(check.id)
              return (
                <label
                  key={check.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    background: isSelected ? `${c.accent}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? `${c.accent}40` : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCheck(setSelected, selected, check.id)}
                    style={{ accentColor: c.accent, width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 11, color: isSelected ? c.text : '#94a3b8', fontWeight: isSelected ? 600 : 400, lineHeight: 1.3 }}>
                    {check.label}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>VPN Policy Management</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setActiveTab('policies')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === 'policies' ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'policies' ? '#00f5ff' : '#64748b',
              borderBottom: activeTab === 'policies' ? '2px solid #00f5ff' : '2px solid transparent',
            }}
          >
            Policies
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === 'monitor' ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'monitor' ? '#00f5ff' : '#64748b',
              borderBottom: activeTab === 'monitor' ? '2px solid #00f5ff' : '2px solid transparent',
            }}
          >
            Compliance Monitor
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 16px', color: '#4ade80', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {activeTab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* ── LEFT: Add/Edit Policy Form ── */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>
                {editingId ? 'Edit Policy' : 'Add New Policy'}
              </h2>
              {editingId && (
                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <X size={14} /> Cancel Edit
                </button>
              )}
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                <Building2 size={13} style={{ marginRight: 6 }} /> Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                style={inputStyle}
              />
            </div>

            {/* Max Users + Session Timeout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>
                  <Users size={13} style={{ marginRight: 6 }} /> Max Users
                </label>
                <input
                  type="number"
                  value={maxUsers}
                  onChange={e => setMaxUsers(e.target.value)}
                  min={1}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  <Clock size={13} style={{ marginRight: 6 }} /> Session Timeout (s)
                </label>
                <input
                  type="number"
                  value={sessionTimeout}
                  onChange={e => setSessionTimeout(e.target.value)}
                  min={60}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Company Emails */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                <Mail size={13} style={{ marginRight: 6 }} /> Company Emails
              </label>
              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 8px', lineHeight: 1.4 }}>
                Only these emails can register and connect to the VPN.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {emails.map((em, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="email"
                      value={em}
                      onChange={e => handleEmailChange(idx, e.target.value)}
                      placeholder={`employee${idx + 1}@company.com`}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {emails.length > 1 && (
                      <button onClick={() => removeEmailField(idx)} style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#f87171',
                        display: 'flex', alignItems: 'center',
                      }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addEmailField}
                style={{
                  marginTop: 8, background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.15)',
                  borderRadius: 8, padding: '6px 14px', color: '#00f5ff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Plus size={13} /> Add Email
              </button>
            </div>

            {/* Compliance Checks */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Compliance Configuration
              </p>

              {renderCheckSection('Critical Checks', Shield, 'red', COMPLIANCE_CHECKS.critical, criticalChecks, setCriticalChecks, 'critical')}
              {renderCheckSection('Warning Checks', ShieldAlert, 'amber', COMPLIANCE_CHECKS.warning, warningChecks, setWarningChecks, 'warning')}
              {renderCheckSection('Informational Checks', Info, 'blue', COMPLIANCE_CHECKS.info, infoChecks, setInfoChecks, 'info')}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00f5ff, #7c3aed)',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s',
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Save Policy'}
            </button>
          </div>

          {/* ── RIGHT: Policies Table ── */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>Company Policies</h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Loading policies...</div>
              </div>
            ) : policies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>No policies yet</p>
                <p style={{ fontSize: 12 }}>Create your first company policy using the form.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Company', 'Max Users', 'Emails', 'Timeout', 'Compliance', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px', color: 'white', fontWeight: 600 }}>{p.company_name}</td>
                        <td style={{ padding: '12px', color: '#94a3b8' }}>{p.max_users}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(p.emails || []).slice(0, 2).map((e, i) => (
                              <span key={i} style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3 }}>{e}</span>
                            ))}
                            {(p.emails || []).length > 2 && (
                              <span style={{ fontSize: 10, color: '#00f5ff', fontWeight: 600 }}>+{p.emails.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{p.session_timeout}s</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ ...badgeStyle, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                              C:{(p.critical_checks || []).length}
                            </span>
                            <span style={{ ...badgeStyle, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                              W:{(p.warning_checks || []).length}
                            </span>
                            <span style={{ ...badgeStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                              I:{(p.info_checks || []).length}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => loadPolicyIntoForm(p)}
                              style={{ ...actionBtnStyle, background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.15)', color: '#00f5ff' }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              style={{ ...actionBtnStyle, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'monitor' && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <ShieldAlert size={48} style={{ color: '#64748b', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Compliance Monitor</h3>
          <p style={{ color: '#64748b', fontSize: 13 }}>Real-time compliance monitoring coming soon.</p>
        </div>
      )}
    </div>
  )
}

// ── Shared styles ──
const labelStyle = {
  display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 6,
}

const inputStyle = {
  width: '100%', background: 'rgba(30,30,60,0.6)', border: '1px solid rgba(100,116,139,0.25)',
  borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
}

const badgeStyle = {
  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
}

const actionBtnStyle = {
  padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
  transition: 'opacity 0.15s',
}
