'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase'
import { decodeInviteToken, acceptInvite } from '../lib/invites'

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [token, setToken] = useState('')
  const [inviteInfo, setInviteInfo] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'verify' | 'signup'>('verify')

  useEffect(() => {
    const inviteToken = searchParams.get('token')
    if (!inviteToken) {
      setError('No invite token provided')
      return
    }

    setToken(inviteToken)
    const decoded = decodeInviteToken(inviteToken)
    if (decoded) {
      setEmail(decoded.email)
      setInviteInfo(decoded)
      setStep('signup')
    } else {
      setError('Invalid or expired invite token')
    }
  }, [searchParams])

  const handleSignup = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Signup failed')

      // Accept the invite
      const { success, error: inviteError } = await acceptInvite(token, data.user.id, password)
      if (!success) throw new Error(inviteError)

      // Redirect to employee dashboard
      router.push('/employee/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        {step === 'verify' ? (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳ Verifying Invite...</h1>
            <div style={{ color: '#999' }}>Please wait...</div>
          </div>
        ) : inviteInfo ? (
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem', textAlign: 'center' }}>
              Join TimeClok
            </h1>
            <p style={{ textAlign: 'center', color: '#999', marginBottom: '2rem' }}>
              You've been invited to join a TimeClok workspace
            </p>

            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0, 217, 255, 0.1)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>
                Email
              </div>
              <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                {email}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#999',
              }}>
                Create Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 0, 110, 0.2)',
                color: '#ff006e',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                width: '100%',
                background: '#00d9ff',
                color: '#000',
                border: 'none',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: '1rem',
              }}
            >
              {loading ? 'Joining...' : 'Join Workspace'}
            </button>

            <div style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '0.875rem',
            }}>
              This will create your account and link you to your employer's workspace.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff006e' }}>
              Invalid Invite
            </h1>
            <p style={{ color: '#999', marginBottom: '2rem' }}>
              {error || 'This invite link is invalid or has expired.'}
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                background: '#00d9ff',
                color: '#000',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  )
}
