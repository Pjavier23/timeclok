'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function ResetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [ready, setReady] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Supabase puts the token in the URL hash — listen for auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    }
  }

  const strength = () => {
    if (!password) return { w: '0%', c: '#333', l: '' }
    if (password.length < 6) return { w: '25%', c: '#ef4444', l: 'Too short' }
    if (password.length < 8) return { w: '50%', c: '#f97316', l: 'Weak' }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { w: '70%', c: '#eab308', l: 'Fair' }
    return { w: '100%', c: '#22c55e', l: 'Strong' }
  }
  const s = strength()

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '2rem' }}>⏱</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#00d9ff', marginTop: '0.25rem' }}>TimeClok</div>
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem', color: '#fff' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '800' }}>Password updated!</h2>
              <p style={{ color: '#555', fontSize: '0.875rem', margin: '0' }}>Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '800' }}>Set new password</h2>
              <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1.75rem' }}>Choose a strong password for your account.</p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.875rem 3rem 0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: s.c, width: s.w, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: s.c, textAlign: 'right', marginTop: '0.25rem' }}>{s.l}</div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${confirm && confirm !== password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                    onBlur={e => { e.target.style.borderColor = confirm && confirm !== password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)' }}
                  />
                  {confirm && confirm !== password && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.3rem' }}>Passwords don't match</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || password !== confirm}
                  style={{ width: '100%', padding: '0.9rem', background: (loading || !password || password !== confirm) ? 'rgba(0,217,255,0.3)' : '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: (loading || !password || password !== confirm) ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
