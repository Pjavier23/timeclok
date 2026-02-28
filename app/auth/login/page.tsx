'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!data.user) throw new Error('Login failed')

      // Check user_type from DB and redirect accordingly
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      if (userData?.user_type === 'employee') {
        router.push('/employee/dashboard')
      } else {
        router.push('/owner/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  const styles = {
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
      maxWidth: '460px',
      width: '100%',
    } as React.CSSProperties,
    logo: {
      textAlign: 'center' as const,
      marginBottom: '2rem',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '800',
      margin: 0,
      background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as React.CSSProperties,
    subtitle: { color: '#999', margin: '0.5rem 0 0', fontSize: '0.875rem' },
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
      transition: 'border-color 0.2s',
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
      marginBottom: '1rem',
      transition: 'opacity 0.2s',
    } as React.CSSProperties,
    error: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      padding: '0.875rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontSize: '0.875rem',
    },
    demoBox: {
      background: 'rgba(0,217,255,0.06)',
      border: '1px solid rgba(0,217,255,0.2)',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1.5rem',
    },
    demoTitle: { fontSize: '0.75rem', color: '#00d9ff', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    demoRow: { fontSize: '0.8rem', color: '#ccc', marginBottom: '0.25rem' },
  }

  const fillDemo = (type: 'owner' | 'employee') => {
    if (type === 'owner') {
      setEmail('demo.owner@timeclok.com')
      setPassword('Demo1234!')
    } else {
      setEmail('demo.employee@timeclok.com')
      setPassword('Demo1234!')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <h1 style={styles.title}>⏱ TimeClok</h1>
          <p style={styles.subtitle}>Employee Time Tracking</p>
        </div>

        {/* Demo credentials */}
        <div style={styles.demoBox}>
          <div style={styles.demoTitle}>🎯 Demo Accounts</div>
          <div style={styles.demoRow}>
            <strong style={{ color: '#00d9ff' }}>Owner:</strong>{' '}
            <span
              onClick={() => fillDemo('owner')}
              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#aaa' }}
            >
              demo.owner@timeclok.com
            </span>{' '}
            / Demo1234!
          </div>
          <div style={styles.demoRow}>
            <strong style={{ color: '#22c55e' }}>Employee:</strong>{' '}
            <span
              onClick={() => fillDemo('employee')}
              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#aaa' }}
            >
              demo.employee@timeclok.com
            </span>{' '}
            / Demo1234!
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.4rem' }}>Click email to auto-fill</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ ...styles.label, marginBottom: 0 }}>Password</label>
              <a href={`/auth/forgot-password?email=${encodeURIComponent(email)}`} style={{ fontSize: '0.78rem', color: '#00d9ff', textDecoration: 'none', fontWeight: '600' }}>
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
          Don't have an account?{' '}
          <a href="/auth/signup" style={{ color: '#00d9ff', textDecoration: 'none' }}>
            Sign up
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
