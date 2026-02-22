'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DemoLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const userType = searchParams.get('userType') || 'owner'
  const company = searchParams.get('company')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing login credentials')
      setLoading(false)
      return
    }

    // Store demo session in localStorage
    localStorage.setItem('demo_logged_in', 'true')
    localStorage.setItem('demo_email', email)
    localStorage.setItem('demo_userType', userType)
    localStorage.setItem('demo_company', company || email.split('@')[0])

    // Redirect to appropriate dashboard
    const timeout = setTimeout(() => {
      if (userType === 'owner') {
        router.push('/owner/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [token, email, userType, company, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0f1f',
        color: '#fff',
        fontSize: '1.25rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>⏱️ TimeClok</h1>
          <p>Logging you in...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0f1f',
      color: '#fff',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <h1>⏱️ TimeClok</h1>
        <p style={{ color: '#ff006e', fontSize: '1.25rem', marginTop: '1rem' }}>
          {error || 'Redirecting...'}
        </p>
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            background: '#00d9ff',
            color: '#000',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
