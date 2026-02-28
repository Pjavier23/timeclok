'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '2rem' }}>⏱</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#00d9ff', marginTop: '0.25rem' }}>TimeClok</div>
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem', color: '#fff' }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: '800' }}>Check your email</h2>
              <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                We sent a password reset link to <strong style={{ color: '#ccc' }}>{email}</strong>. Click it to set a new password.
              </p>
              <p style={{ color: '#444', fontSize: '0.78rem', margin: '0 0 1.5rem' }}>
                Didn't get it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '800' }}>Forgot your password?</h2>
              <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
                Enter your email and we'll send you a link to reset it.
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{ width: '100%', padding: '0.9rem', background: (!email || loading) ? 'rgba(0,217,255,0.3)' : '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: (!email || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#444' }}>
            <a href="/auth/login" style={{ color: '#00d9ff', textDecoration: 'none', fontWeight: '600' }}>← Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
