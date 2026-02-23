'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function SignUpForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      if (!companyName) {
        throw new Error('Company name is required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          companyName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setSuccess(true)
      setSuccessEmail(email)
      localStorage.removeItem('demo_mode')
      
      // Redirect to login in 2 seconds
      setTimeout(() => {
        router.push('/auth/login?email=' + encodeURIComponent(email))
      }, 2000)
      
    } catch (err: any) {
      const errorMsg = err.message || 'Signup failed. Please try again.'
      setError(errorMsg)
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#fff',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          background: 'rgba(0, 217, 255, 0.1)',
          border: '2px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '1rem',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#00d9ff' }}>
            Account Created!
          </h2>
          <p style={{ marginBottom: '2rem', color: '#ccc' }}>
            Welcome to TimeClok, <strong>{successEmail}</strong>
          </p>
          <div style={{
            background: 'rgba(255, 221, 0, 0.1)',
            border: '1px solid rgba(255, 221, 0, 0.3)',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            color: '#ffdd00',
            fontSize: '0.875rem'
          }}>
            <strong>🎉 You're all set!</strong>
            <p style={{ marginTop: '1rem' }}>Redirecting to login page...</p>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#00d9ff',
              color: '#000',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Go to Login Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#fff',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{marginBottom: '2rem', textAlign: 'center'}}>⏱️ TimeClok Sign Up</h1>

        <form onSubmit={handleSignUp}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxSizing: 'border-box',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxSizing: 'border-box',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{marginBottom: '1.5rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxSizing: 'border-box',
                fontSize: '1rem'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 0, 110, 0.2)',
              color: '#ff006e',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#00d9ff',
              color: '#000',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{textAlign: 'center', color: '#999', fontSize: '0.875rem'}}>
          Already have an account?{' '}
          <a
            href="/auth/login"
            style={{color: '#00d9ff', textDecoration: 'none'}}
          >
            Log in
          </a>
        </div>
      </div>
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        Loading...
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
