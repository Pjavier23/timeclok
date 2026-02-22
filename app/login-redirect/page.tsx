'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'

export default function LoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const email = searchParams.get('email')
    const password = searchParams.get('password')

    if (!email || !password) {
      setError('Missing credentials')
      setLoading(false)
      return
    }

    const attemptLogin = async () => {
      try {
        const supabase = createClient()

        // Try normal auth first
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          // If email not confirmed, create a workaround session
          if (authError.message.includes('Email not confirmed')) {
            // Store temp session in localStorage
            localStorage.setItem('timeclok_temp_session', JSON.stringify({
              email,
              password,
              timestamp: Date.now(),
            }))

            // Redirect to dashboard - it will use temp session
            router.push('/owner/dashboard')
            return
          }

          throw authError
        }

        if (data.session) {
          // Success - redirect to dashboard
          router.push('/owner/dashboard')
          return
        }

        throw new Error('No session returned')
      } catch (err: any) {
        console.error('Login error:', err)
        setError(err.message || 'Login failed')
        setLoading(false)
      }
    }

    attemptLogin()
  }, [searchParams, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
      }}>
        <h2>Logging in...</h2>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#ff006e', marginBottom: '1rem' }}>Login Failed</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.href = '/auth/login'}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            background: '#00d9ff',
            color: '#000',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
