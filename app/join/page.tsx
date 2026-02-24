'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('25')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const companyId = searchParams.get('company')

  useEffect(() => {
    if (!companyId) {
      setError('Invalid invite link — no company ID found')
      setLoading(false)
      return
    }

    fetch(`/api/join?company=${encodeURIComponent(companyId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setCompany(data.company)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to verify invite link')
        setLoading(false)
      })
  }, [companyId])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, companyId, hourlyRate }),
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setSubmitting(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push(`/auth/login?email=${encodeURIComponent(email)}`), 2000)
    }
  }

  const S = {
    page: {
      background: '#0f0f0f',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    } as React.CSSProperties,
    card: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '2.5rem',
      maxWidth: '480px',
      width: '100%',
    } as React.CSSProperties,
    logo: { fontSize: '1.75rem', fontWeight: '800', color: '#00d9ff', textAlign: 'center' as const, marginBottom: '0.5rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#ccc' },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#fff',
      borderRadius: '8px',
      boxSizing: 'border-box' as const,
      fontSize: '1rem',
      outline: 'none',
    },
    btn: {
      width: '100%',
      padding: '0.875rem',
      background: '#00d9ff',
      color: '#000',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '700',
      fontSize: '1rem',
      cursor: 'pointer',
    } as React.CSSProperties,
    error: {
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      padding: '0.875rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontSize: '0.875rem',
    },
    success: {
      background: 'rgba(34,197,94,0.1)',
      border: '1px solid rgba(34,197,94,0.3)',
      color: '#22c55e',
      padding: '1.5rem',
      borderRadius: '8px',
      textAlign: 'center' as const,
      fontSize: '1rem',
    },
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ color: '#666' }}>Verifying invite...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>⏱ TimeClok</div>

        {error && !company ? (
          <div>
            <div style={{ ...S.error, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌</div>
              {error}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <a href="/" style={{ color: '#00d9ff', textDecoration: 'none' }}>← Back to home</a>
            </div>
          </div>
        ) : success ? (
          <div style={S.success}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Welcome to {company?.name}!</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Redirecting to login...</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>You've been invited to join</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#00d9ff' }}>{company?.name}</div>
            </div>

            {error && <div style={S.error}>⚠️ {error}</div>}

            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={S.label}>Your Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  style={S.input}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={S.label}>Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={S.input}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={S.label}>Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={S.input}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={S.label}>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  style={S.input}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ ...S.btn, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Creating account...' : `Join ${company?.name}`}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#555' }}>
              Already have an account?{' '}
              <a href="/auth/login" style={{ color: '#00d9ff', textDecoration: 'none' }}>Sign in</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Join() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ color: '#666' }}>Loading...</div>
        </div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
