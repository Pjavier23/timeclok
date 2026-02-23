'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [hourlyRate, setHourlyRate] = useState('25')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const cid = searchParams.get('company')
    setCompanyId(cid)
    
    if (cid) {
      fetchCompanyName(cid)
    } else {
      setError('Invalid invite link')
      setLoading(false)
    }
  }, [searchParams])

  const fetchCompanyName = async (cid: string) => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', cid)
        .single()
      
      if (company) {
        setCompanyName(company.name)
      }
      setLoading(false)
    } catch (err) {
      setError('Company not found')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (!email || !password) throw new Error('Email and password required')
      if (!companyId) throw new Error('Company not found')

      // Sign up
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) throw signupError
      if (!data.user) throw new Error('Signup failed')

      const userId = data.user.id

      // Create user profile
      await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          full_name: email.split('@')[0],
          user_type: 'employee',
          company_id: companyId,
        }])

      // Create employee record
      await supabase
        .from('employees')
        .insert([{
          user_id: userId,
          company_id: companyId,
          hourly_rate: parseFloat(hourlyRate),
          employee_type: 'w2',
        }])

      // Redirect to login
      router.push('/auth/login?email=' + encodeURIComponent(email))
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

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
        Loading...
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
        <h1 style={{marginBottom: '2rem', textAlign: 'center'}}>⏱️ Join TimeClok</h1>

        {error ? (
          <div style={{
            background: 'rgba(255, 0, 110, 0.2)',
            color: '#ff006e',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '1rem' }}>❌ {error}</div>
            <a href="/" style={{ color: '#ff006e', textDecoration: 'underline' }}>Go back</a>
          </div>
        ) : (
          <>
            <p style={{textAlign: 'center', marginBottom: '2rem', color: '#ccc'}}>
              Join <strong>{companyName}</strong> as an employee
            </p>

            <form onSubmit={handleSignup}>
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

              <div style={{marginBottom: '1rem'}}>
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

              <div style={{marginBottom: '1.5rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
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

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#00d9ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Joining...' : 'Join Company'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function Join() {
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
      <JoinContent />
    </Suspense>
  )
}
