'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const companyId = searchParams.get('company')
  const prefilledName = searchParams.get('name') || ''

  const [status, setStatus] = useState<'waiting' | 'ready' | 'done' | 'error'>('waiting')
  const [fullName, setFullName] = useState(prefilledName)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const supabase = createClient()

  useEffect(() => {
    // Fetch company name if we have an ID
    if (companyId) {
      fetch(`/api/join?company=${encodeURIComponent(companyId)}`)
        .then(r => r.json())
        .then(d => { if (d.company?.name) setCompanyName(d.company.name) })
        .catch(() => {})
    }

    // Listen for Supabase auth events from the invite link token in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUserEmail(session.user.email || '')
          if (!fullName && prefilledName) setFullName(prefilledName)
          setStatus('ready')
        }
      }
    })

    // Also check for existing session (in case page is refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setStatus('ready')
      } else {
        // Give the hash token a moment to process
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s?.user) {
              setUserEmail(s.user.email || '')
              setStatus('ready')
            } else {
              setErrorMsg('Your invite link may have expired or already been used. Please ask your employer to resend the invite.')
              setStatus('error')
            }
          })
        }, 2500)
      }
    })

    return () => subscription.unsubscribe()
  }, [companyId])

  const strength = () => {
    if (!password) return { w: '0%', c: '#333', l: '' }
    if (password.length < 6) return { w: '25%', c: '#ef4444', l: 'Too short' }
    if (password.length < 8) return { w: '50%', c: '#f97316', l: 'Weak' }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { w: '70%', c: '#eab308', l: 'Fair' }
    return { w: '100%', c: '#22c55e', l: 'Strong' }
  }
  const s = strength()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setErrorMsg("Passwords don't match"); return }
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters'); return }
    if (!fullName.trim()) { setErrorMsg('Please enter your full name'); return }
    setLoading(true)
    setErrorMsg('')

    // 1. Set the password
    const { error: pwErr } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName.trim() },
    })
    if (pwErr) {
      setErrorMsg(pwErr.message)
      setLoading(false)
      return
    }

    // 2. Create user profile + employee record in DB (if company is known)
    if (companyId) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        try {
          await fetch('/api/join/finalize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ companyId, fullName: fullName.trim(), email: userEmail }),
          })
        } catch (err) {
          console.error('Finalize error:', err)
          // Non-fatal — user can still log in
        }
      }
    }

    setStatus('done')
    setTimeout(() => router.push('/employee/dashboard'), 2500)
  }

  // ── Styles ──────────────────────────────────────────────────────
  const accent = '#00d9ff'
  const S: Record<string, React.CSSProperties> = {
    page: {
      background: '#0f0f0f', minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#fff',
    },
    card: {
      background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', maxWidth: '460px', width: '100%', overflow: 'hidden',
    },
    banner: {
      background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
      borderBottom: `1px solid ${accent}22`, padding: '2rem', textAlign: 'center',
    },
    body: { padding: '2rem' },
    label: {
      display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem',
      fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em',
    },
    input: {
      width: '100%', padding: '0.875rem 1rem',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', color: '#fff', fontSize: '0.9375rem',
      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
    },
    btn: {
      width: '100%', padding: '1rem', background: accent, color: '#000',
      border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem',
      cursor: 'pointer', marginTop: '1.5rem', transition: 'opacity 0.2s',
    },
    error: {
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
      color: '#ef4444', padding: '0.875rem 1rem', borderRadius: '10px',
      fontSize: '0.875rem', marginBottom: '1.25rem',
    },
  }

  // ── Loading ──
  if (status === 'waiting') return (
    <div style={{ ...S.page, gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>⏱</div>
      <div style={{ color: '#555' }}>Verifying your invite...</div>
      <div style={{ width: '200px', height: '2px', background: '#1a1a1a', borderRadius: '99px', overflow: 'hidden', marginTop: '0.5rem' }}>
        <div style={{ height: '100%', width: '40%', background: accent, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )

  // ── Error ──
  if (status === 'error') return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem' }}>Invite Link Issue</div>
        <div style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{errorMsg}</div>
        <a href="/auth/login" style={{ color: accent, textDecoration: 'none', fontSize: '0.9rem' }}>← Go to Login</a>
      </div>
    </div>
  )

  // ── Done ──
  if (status === 'done') return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>You're all set!</div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          Welcome{companyName ? ` to ${companyName}` : ''}! Taking you to your dashboard...
        </div>
        <div style={{ marginTop: '1.5rem', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: accent, width: '100%' }} />
        </div>
      </div>
    </div>
  )

  // ── Set Password Form ──
  return (
    <div style={S.page}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/" style={{ fontSize: '1.5rem', fontWeight: '900', color: accent, letterSpacing: '-0.5px', textDecoration: 'none' }}>⏱ TimeClok</a>
      </div>

      <div style={S.card}>
        <div style={S.banner}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
          <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '0.25rem' }}>
            CREATE YOUR ACCOUNT
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
            {companyName ? `Join ${companyName}` : 'Set Your Password'}
          </div>
          {userEmail && (
            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.4rem' }}>{userEmail}</div>
          )}
        </div>

        <div style={S.body}>
          {errorMsg && <div style={S.error}>⚠️ {errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>Your Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                style={S.input}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{ ...S.input, paddingRight: '3rem' }}
                  onFocus={e => (e.target.style.borderColor = accent)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: s.c, width: s.w, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: s.c, marginTop: '0.3rem', textAlign: 'right' }}>{s.l}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                style={{
                  ...S.input,
                  borderColor: confirm.length > 0
                    ? (confirm === password ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)')
                    : 'rgba(255,255,255,0.1)',
                }}
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = confirm.length > 0 ? (confirm === password ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : 'rgba(255,255,255,0.1)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Setting up your account...' : 'Create Account & Get Started →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#444' }}>
            Already have an account?{' '}
            <a href="/auth/login" style={{ color: accent, textDecoration: 'none', fontWeight: '600' }}>Sign in</a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#333', textAlign: 'center' }}>
        Powered by TimeClok · Employee Time Tracking
      </div>
    </div>
  )
}

export default function SetPassword() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ color: '#555' }}>Loading...</div>
        </div>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  )
}
