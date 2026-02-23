'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Authenticate with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError
      if (!data.user) throw new Error('Login failed')

      // Small delay to ensure session is set
      await new Promise(r => setTimeout(r, 500))

      // Redirect to dashboard
      router.push('/owner/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
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
        <h1 style={{marginBottom: '2rem', textAlign: 'center'}}>⏱️ TimeClok Log In</h1>

        <form onSubmit={handleLogin}>
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
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{textAlign: 'center', color: '#999', fontSize: '0.875rem'}}>
          Don't have an account?{' '}
          <a
            href="/auth/signup"
            style={{color: '#00d9ff', textDecoration: 'none'}}
          >
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
      <LoginForm />
    </Suspense>
  )
}
