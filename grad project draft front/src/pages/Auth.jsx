import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Minus, Square, X, Copy } from 'lucide-react'

const API = 'http://127.0.0.1:3001/api/auth'
const POLICY_API = 'http://127.0.0.1:3001/api/policy'

export default function Auth() {
  const navigate = useNavigate()
  const [step, setStep] = useState('login')       // 'login' | 'register' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isMaximized, setIsMaximized] = useState(false)

  // ── Track maximize state for window controls ──
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.windowIsMaximized().then(setIsMaximized)
    const cleanup = window.electronAPI.onMaximizedChange((maximized) => {
      setIsMaximized(maximized)
    })
    return cleanup
  }, [])

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('vpn_token')
    if (token) navigate('/app/dashboard', { replace: true })
  }, [navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const clearMessages = () => { setError(''); setSuccess('') }
  
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const validatePassword = (password, userEmail) => {
    // Exempt these emails from the complex password check
    const exemptEmails = ['ys5313944@gmail.com', 'yahiasaad1904@gmail.com'];
    if (exemptEmails.includes(userEmail)) return true;
    
    // 8+ chars, 1 upper, 1 lower, 1 special
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(password);
  };

  // ── Password strength checks (used in register form) ──
  const passwordChecks = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'Special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
    { label: 'Number (0-9)', test: (p) => /[0-9]/.test(p) },
  ];
  
  const allPasswordChecksPassed = passwordChecks.every(c => c.test(password));
  const isFormValid = validateEmail(email) && (step === 'otp' || (step === 'register' ? allPasswordChecksPassed : validatePassword(password, email)));

  // ── Register ───────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Registration failed')
      setSuccess('Account created! Please log in.')
      setStep('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Login ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')
      setSuccess('OTP sent to your email!')
      setStep('otp')
      setCooldown(30)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP ─────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const res = await fetch(`${API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Invalid OTP')
      localStorage.setItem('vpn_token', data.token)
      localStorage.setItem('vpn_user', JSON.stringify({ email, role: data.role || 'user' }))
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ─────────────────────────────────────────
  const handleResend = async () => {
    clearMessages()
    try {
      const res = await fetch(`${API}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Resend failed')
      setSuccess('New code sent!')
      setCooldown(30)
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Forgot Password (Send OTP) ───────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const res = await fetch(`${API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Forgot password failed')
      setSuccess('Reset code sent to your email!')
      setStep('reset-password')
      setCooldown(30)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Reset Password ────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    clearMessages()
    if (!validatePassword(password, email)) {
      setError('Password must be 8+ chars and have upper/lower/special characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Reset failed')
      setSuccess('Password updated! Please log in.')
      setStep('login')
      setPassword('')
      setOtp('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Password strength dots ──
  const renderPasswordDots = () => {
    const filled = passwordChecks.filter(c => c.test(password)).length
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, marginBottom: 4 }}>
        {passwordChecks.map((_, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < filled
                ? (filled <= 2 ? '#ef4444' : filled <= 4 ? '#f59e0b' : '#22c55e')
                : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
              boxShadow: i < filled
                ? `0 0 8px ${filled <= 2 ? 'rgba(239,68,68,0.4)' : filled <= 4 ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`
                : 'none',
            }}
          />
        ))}
      </div>
    )
  }

  // ── Password checklist ──
  const renderPasswordChecklist = () => {
    if (!password) return null
    return (
      <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
        {passwordChecks.map((check, i) => {
          const passed = check.test(password)
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
              fontSize: 11, color: passed ? '#4ade80' : '#94a3b8',
              transition: 'color 0.2s',
            }}>
              <span style={{
                fontSize: 12, width: 16, textAlign: 'center',
                transition: 'transform 0.2s',
                transform: passed ? 'scale(1.1)' : 'scale(1)',
              }}>
                {passed ? '✓' : '○'}
              </span>
              <span style={{ textDecoration: passed ? 'none' : 'none', opacity: passed ? 1 : 0.7 }}>
                {check.label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060818' }}>
      {/* ─── Native Titlebar ─── */}
      <div className="titlebar" style={{
        height: 36, background: '#080a1e', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <Shield size={13} style={{ color: '#06b6d4' }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>
            Corpo VPN — Sign In
          </span>
        </div>
        <div className="window-controls" style={{ display: 'flex' }}>
          <button onClick={() => window.electronAPI?.windowMinimize()}
            style={{ width: 44, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            className="titlebar-btn-hover" title="Minimize">
            <Minus size={14} style={{ color: '#94a3b8' }} />
          </button>
          <button onClick={() => window.electronAPI?.windowMaximize()}
            style={{ width: 44, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            className="titlebar-btn-hover" title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized
              ? <Copy size={12} style={{ color: '#94a3b8' }} />
              : <Square size={11} style={{ color: '#94a3b8' }} />
            }
          </button>
          <button onClick={() => window.electronAPI?.windowClose()}
            style={{ width: 44, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            className="titlebar-btn-close" title="Close">
            <X size={14} style={{ color: '#94a3b8' }} />
          </button>
        </div>
      </div>

      {/* ─── Auth Content ─── */}
      <div style={{ ...styles.page, flex: 1, minHeight: 0 }}>
        {/* Animated background */}
        <div style={styles.bgGlow} />

        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>🔐</div>
            <h1 style={styles.title}>Corpo VPN</h1>
            <p style={styles.subtitle}>
              {step === 'otp' ? 'Enter verification code' : step === 'register' ? 'Create your account' : 'Sign in to continue'}
            </p>
          </div>

        {/* Messages */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {/* ── LOGIN FORM ── */}
        {step === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading || !isFormValid} style={{...styles.btn, opacity: (loading || !isFormValid) ? 0.5 : 1, cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p style={styles.switchText}>
              <span style={styles.switchLink} onClick={() => { setStep('forgot-password'); clearMessages() }}>
                Forgot Password?
              </span>
            </p>
            <p style={styles.switchText}>
              Don't have an account?{' '}
              <span style={styles.switchLink} onClick={() => { setStep('register'); clearMessages(); setPassword('') }}>
                Register
              </span>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {step === 'register' && (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={styles.input}
              />
              <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                Your email must be registered in a company policy by an admin.
              </p>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
              />
              {renderPasswordDots()}
              {renderPasswordChecklist()}
            </div>
            <button type="submit" disabled={loading || !isFormValid} style={{...styles.btn, opacity: (loading || !isFormValid) ? 0.5 : 1, cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
            <p style={styles.switchText}>
              Already have an account?{' '}
              <span style={styles.switchLink} onClick={() => { setStep('login'); clearMessages(); setPassword('') }}>
                Sign In
              </span>
            </p>
          </form>
        )}

        {/* ── OTP FORM ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <p style={styles.otpInfo}>
              A 6-digit code was sent to <strong style={{ color: '#00f5ff' }}>{email}</strong>
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                style={{ ...styles.input, ...styles.otpInput }}
              />
            </div>
            <button type="submit" disabled={loading || otp.length !== 6} style={styles.btn}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <div style={styles.resendWrap}>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                style={{
                  ...styles.resendBtn,
                  opacity: cooldown > 0 ? 0.4 : 1,
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
              <span style={styles.switchLink} onClick={() => { setStep('login'); setOtp(''); clearMessages() }}>
                ← Back to login
              </span>
            </div>
          </form>
        )}
        {/* ── FORGOT PASSWORD FORM ── */}
        {step === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Recover Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading || !validateEmail(email)} style={{...styles.btn, opacity: (loading || !validateEmail(email)) ? 0.5 : 1, cursor: (loading || !validateEmail(email)) ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <p style={styles.switchText}>
              <span style={styles.switchLink} onClick={() => { setStep('login'); clearMessages() }}>
                ← Back to login
              </span>
            </p>
          </form>
        )}

        {/* ── RESET PASSWORD FORM ── */}
        {step === 'reset-password' && (
          <form onSubmit={handleResetPassword} style={styles.form}>
             <p style={styles.otpInfo}>
              Enter the reset code sent to <strong style={{ color: '#00f5ff' }}>{email}</strong>
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Reset Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                style={{ ...styles.input, ...styles.otpInput }}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
              />
              {renderPasswordDots()}
              {renderPasswordChecklist()}
            </div>
            <button type="submit" disabled={loading || otp.length !== 6 || !allPasswordChecksPassed} style={{...styles.btn, opacity: (loading || otp.length !== 6 || !allPasswordChecksPassed) ? 0.5 : 1, cursor: (loading || otp.length !== 6 || !allPasswordChecksPassed) ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <p style={styles.switchText}>
              <span style={styles.switchLink} onClick={() => { setStep('login'); clearMessages() }}>
                ← Cancel
              </span>
            </p>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Inline styles ────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  bgGlow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: 400,
    background: 'rgba(15, 15, 35, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 245, 255, 0.12)',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 245, 255, 0.04)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #00f5ff, #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    background: 'rgba(30, 30, 60, 0.6)',
    border: '1px solid rgba(100, 116, 139, 0.3)',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 15,
    color: '#e2e8f0',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 12,
    fontWeight: 700,
  },
  btn: {
    marginTop: 4,
    padding: '14px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #00f5ff, #7c3aed)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  switchText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    margin: 0,
  },
  switchLink: {
    color: '#00f5ff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  otpInfo: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
  resendWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  resendBtn: {
    background: 'none',
    border: 'none',
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: 500,
    padding: 0,
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f87171',
    fontSize: 13,
    marginBottom: 8,
  },
  successBox: {
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#4ade80',
    fontSize: 13,
    marginBottom: 8,
  },
}
