'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLang } from '../contexts/LanguageContext'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<'loading' | 'info' | 'success' | 'error'>('loading')
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const companyId = searchParams.get('company')
  const prefilledEmail = searchParams.get('email') || ''

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail)

    if (!companyId) {
      setErrorMsg('Invalid invite link — no company ID found.')
      setStep('error')
      return
    }

    fetch(`/api/join?company=${encodeURIComponent(companyId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStep('error') }
        else { setCompany(data.company); setStep('info') }
      })
      .catch(() => { setErrorMsg('Failed to verify invite link.'); setStep('error') })
  }, [companyId, prefilledEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setSubmitting(true)
    setErrorMsg('')

    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, companyId }),
    })
    const data = await res.json()

    if (data.error) {
      setErrorMsg(data.error)
      setSubmitting(false)
    } else {
      setStep('success')
      setTimeout(() => router.push(`/auth/login?email=${encodeURIComponent(email)}`), 3000)
    }
  }

  const passwordStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: '', color: '#333', width: '0%' }
    if (password.length < 6) return { label: 'Too short', color: '#ef4444', width: '25%' }
    if (password.length < 8) return { label: 'Weak', color: '#f97316', width: '50%' }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Fair', color: '#eab308', width: '70%' }
    return { label: 'Strong', color: '#22c55e', width: '100%' }
  }

  const strength = passwordStrength()

  const companyInitial = company?.name?.[0]?.toUpperCase() || '?'
  const companyColors = ['#00d9ff', '#7c3aed', '#059669', '#d97706', '#dc2626']
  const colorIdx = company ? company.name.charCodeAt(0) % companyColors.length : 0
  const accentColor = companyColors[colorIdx]

  // ── Styles ──────────────────────────────────────────────────────
  const S = {
    page: {
      background: '#0f0f0f',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff',
    },
    card: {
      background: '#161616',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '0',
      maxWidth: '460px',
      width: '100%',
      overflow: 'hidden',
    },
    banner: {
      background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
      borderBottom: `1px solid ${accentColor}22`,
      padding: '2rem',
      textAlign: 'center' as const,
    },
    avatar: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: accentColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.75rem',
      fontWeight: '900',
      color: '#000',
      margin: '0 auto 1rem',
    },
    body: { padding: '2rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
    input: {
      width: '100%',
      padding: '0.875rem 1rem',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '0.9375rem',
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s',
    },
    btn: {
      width: '100%',
      padding: '1rem',
      background: accentColor,
      color: accentColor === '#00d9ff' ? '#000' : '#fff',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '700',
      fontSize: '1rem',
      cursor: 'pointer',
      marginTop: '1.5rem',
      transition: 'opacity 0.2s',
    },
    error: {
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.25)',
      color: '#ef4444',
      padding: '0.875rem 1rem',
      borderRadius: '10px',
      fontSize: '0.875rem',
      marginBottom: '1.25rem',
    },
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ ...S.page, gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>⏱</div>
      <div style={{ color: '#555', fontSize: '0.9rem' }}>Verifying your invite...</div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Invalid Invite Link</div>
        <div style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{errorMsg}</div>
        <a href="/" style={{ color: accentColor, textDecoration: 'none', fontSize: '0.9rem' }}>← Back to TimeClok</a>
      </div>
    </div>
  )

  // ── Success ──────────────────────────────────────────────────────
  if (step === 'success') return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'none' }}>🎉</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff' }}>
          You're in!
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Welcome to <span style={{ color: accentColor, fontWeight: '700' }}>{company?.name}</span>
        </div>
        <div style={{ color: '#444', fontSize: '0.8rem', marginTop: '1.5rem' }}>Redirecting to login...</div>
        <div style={{ marginTop: '0.75rem', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: accentColor, width: '100%', transition: 'none' }} />
        </div>
      </div>
    </div>
  )

  // ── Main Form ────────────────────────────────────────────────────
  const { t } = useLang()
  return (
    <div style={S.page}>
      {/* Top bar: logo + language toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <a href="/" style={{ fontSize: '1.5rem', fontWeight: '900', color: '#00d9ff', letterSpacing: '-0.5px', textDecoration: 'none' }}>⏱ TimeClok</a>
        <LanguageToggle />
      </div>

      <div style={S.card}>
        {/* Company banner */}
        <div style={S.banner}>
          <div style={S.avatar}>{companyInitial}</div>
          <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '0.25rem' }}>
            {t.youveBeenInvited}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>{company?.name}</div>
        </div>

        {/* Form */}
        <div style={S.body}>
          {errorMsg && <div style={S.error}>⚠️ {errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>{t.fullName}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                style={S.input}
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...S.input, ...(prefilledEmail ? { background: 'rgba(0,217,255,0.05)', borderColor: 'rgba(0,217,255,0.2)' } : {}) }}
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = prefilledEmail ? 'rgba(0,217,255,0.2)' : 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={S.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{ ...S.input, paddingRight: '3rem' }}
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: strength.color, width: strength.width, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: strength.color, marginTop: '0.3rem', textAlign: 'right' }}>{strength.label}</div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ ...S.btn, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? t.joiningBtn : `${t.joinBtn} ${company?.name} →`}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#444' }}>
            {t.alreadyHaveAccount}{' '}
            <a href="/auth/login" style={{ color: accentColor, textDecoration: 'none', fontWeight: '600' }}>Sign in</a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#333', textAlign: 'center' }}>
        Powered by TimeClok · Employee Time Tracking
      </div>
    </div>
  )
}

export default function Join() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ color: '#555' }}>Loading...</div>
        </div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
