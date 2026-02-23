'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [message, setMessage] = useState('Confirming your email...')
  const [error, setError] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token = searchParams.get('token')
        const type = searchParams.get('type')
        
        if (!token || type !== 'email') {
          setError('Invalid confirmation link')
          return
        }

        // Exchange token for session
        const { data, error: err } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        })

        if (err) {
          setError(err.message || 'Failed to confirm email')
          return
        }

        if (data.user) {
          setMessage('✅ Email confirmed! Redirecting to dashboard...')
          setIsConfirmed(true)
          
          setTimeout(() => {
            router.push('/owner/dashboard')
          }, 2000)
        }
      } catch (err: any) {
        setError(err.message || 'Confirmation failed')
      }
    }

    confirmEmail()
  }, [searchParams])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui',
      flexDirection: 'column',
      gap: '2rem',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>⏱️</div>
      <h1 style={{ fontSize: '1.5rem', textAlign: 'center' }}>TimeClok</h1>
      
      {error ? (
        <div style={{
          background: 'rgba(255, 0, 110, 0.2)',
          color: '#ff006e',
          padding: '1.5rem',
          borderRadius: '1rem',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            ❌ Error
          </div>
          <div style={{ marginBottom: '2rem' }}>{error}</div>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              background: '#ff006e',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Back to Login
          </button>
        </div>
      ) : isConfirmed ? (
        <div style={{
          background: 'rgba(0, 217, 255, 0.2)',
          color: '#00d9ff',
          padding: '1.5rem',
          borderRadius: '1rem',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
          <div>{message}</div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255, 221, 0, 0.2)',
          color: '#ffdd00',
          padding: '1.5rem',
          borderRadius: '1rem',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
          <div>{message}</div>
        </div>
      )}
    </div>
  )
}

export default function ConfirmPage() {
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
      <ConfirmContent />
    </Suspense>
  )
}
