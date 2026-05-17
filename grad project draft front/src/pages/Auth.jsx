import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Minus, Square, X, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AUTH_API, POLICY_API } from '../lib/api'

export default function Auth() {
  const navigate = useNavigate()
  const [step, setStep] = useState('login')       // 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpType, setOtpType] = useState('signup')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
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

  // Listen for Supabase auth state changes (e.g. password reset redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('reset-password')
        setSuccess('You can now set a new password.')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const clearMessages = () => { setError(''); setSuccess('') }
  
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const validatePassword = (password, userEmail) => {
    const exemptEmails = ['ys5313944@gmail.com', 'yahiasaad1904@gmail.com'];
    if (exemptEmails.includes(userEmail)) return true;
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
  const isFormValid = validateEmail(email) && (step === 'register' ? allPasswordChecksPassed : password.length > 0);

  // ── Register ───────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      // Step 1: Check if email is in a policy (backend validates)
      const policyRes = await fetch(`${POLICY_API}/check-email?email=${encodeURIComponent(email)}`)
      const policyData = await policyRes.json()
      
      // Allow exempt emails and policy-listed emails
      const exemptEmails = ['ys5313944@gmail.com', 'yahiasaad1904@gmail.com']
      if (!exemptEmails.includes(email) && !policyData.allowed) {
        throw new Error('Your email is not associated with any organization. Contact your admin to be added to a VPN policy.')
      }

      // Step 2: Sign up with Supabase Auth (OTP instead of link)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (signUpError) throw new Error(signUpError.message)

      setOtpType('signup')
      setStep('verify-otp')
      setSuccess('Verification code sent to your email. Please enter it below.')
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
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw new Error(signInError.message)

      const accessToken = data.session.access_token

      // Sync with backend to get role
      const syncRes = await fetch(`${AUTH_API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const syncData = await syncRes.json()
      const role = syncData.role || 'user'

      // Store session info
      localStorage.setItem('vpn_token', accessToken)
      localStorage.setItem('vpn_user', JSON.stringify({ email, role }))
      
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot Password (Send OTP via Supabase) ───────────
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw new Error(resetError.message)
      
      setOtpType('recovery')
      setStep('verify-otp')
      setSuccess('Password reset code sent! Check your inbox.')
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
    if (!otp) return setError('Please enter the verification code')
    setLoading(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: otpType,
      })
      if (verifyError) throw new Error(verifyError.message)
      
      if (otpType === 'signup') {
        // Create local user record in backend (provisions VPN peer)
        const regRes = await fetch(`${AUTH_API}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const regData = await regRes.json()
        if (!regRes.ok) throw new Error(regData.message || 'Registration failed')

        setSuccess('Email verified! You can now log in.')
        setStep('login')
        setOtp('')
      } else if (otpType === 'recovery') {
        setSuccess('Code verified! Please set your new password.')
        setStep('reset-password')
        setOtp('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Reset Password ──────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    clearMessages()
    if (!validatePassword(password, email)) {
      setError('Password must be 8+ chars and have upper/lower/special characters')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw new Error(updateError.message)
      
      try {
        await fetch(`${AUTH_API}/log-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'Password Reset', details: 'User successfully reset their password via OTP' }),
        });
      } catch (logErr) {
        console.warn('Failed to log event', logErr);
      }

      await supabase.auth.signOut() // Sign out to force re-login with new password
      setSuccess('Password updated! Please log in with your new password.')
      setStep('login')
      setPassword('')
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
              {step === 'register' ? 'Create your account' : step === 'forgot-password' ? 'Reset your password' : step === 'reset-password' ? 'Set new password' : 'Sign in to continue'}
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
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <p style={styles.switchText}>
              <span style={styles.switchLink} onClick={() => { setStep('login'); clearMessages() }}>
                ← Back to login
              </span>
            </p>
          </form>
        )}

        {/* ── VERIFY OTP FORM ── */}
        {step === 'verify-otp' && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading || !otp} style={{...styles.btn, opacity: (loading || !otp) ? 0.5 : 1, cursor: (loading || !otp) ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <p style={styles.switchText}>
              <span style={styles.switchLink} onClick={() => { setStep('login'); clearMessages() }}>
                ← Back to login
              </span>
            </p>
          </form>
        )}

        {/* ── RESET PASSWORD FORM (after verifying recovery OTP) ── */}
        {step === 'reset-password' && (
          <form onSubmit={handleResetPassword} style={styles.form}>
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
            <button type="submit" disabled={loading || !allPasswordChecksPassed} style={{...styles.btn, opacity: (loading || !allPasswordChecksPassed) ? 0.5 : 1, cursor: (loading || !allPasswordChecksPassed) ? 'not-allowed' : 'pointer'}}>
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
