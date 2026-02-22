'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [userType, setUserType] = useState<'owner' | 'employee'>('owner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      if (userType === 'owner' && !companyName) {
        throw new Error('Company name is required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please log in or use a different email.')
        }
        throw authError
      }
      if (!authData.user) throw new Error('Account creation failed')

      // Wait a moment for auth to settle
      await new Promise(resolve => setTimeout(resolve, 500))

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email,
          full_name: companyName || email.split('@')[0],
          user_type: userType,
          company_id: null
        }])

      if (profileError) {
        console.error('Profile error:', profileError)
        if (profileError.code !== '23505') throw profileError
      }

      // If owner, create company
      if (userType === 'owner') {
        const { data: compData, error: compError } = await supabase
          .from('companies')
          .insert([{
            name: companyName,
            owner_id: authData.user.id
          }])
          .select()
          .single()

        if (compError) {
          console.error('Company error:', compError)
          throw new Error(`Failed to create company: ${compError.message}`)
        }

        // Update user with company_id
        await supabase
          .from('users')
          .update({ company_id: compData.id })
          .eq('id', authData.user.id)
      }

      // Set demo mode off and redirect
      localStorage.removeItem('demo_mode')
      
      // Redirect to dashboard
      setTimeout(() => {
        if (userType === 'owner') {
          router.push('/owner/dashboard')
        } else {
          router.push('/employee/dashboard')
        }
      }, 500)
      
    } catch (err: any) {
      const errorMsg = err.message || err.error_description || 'Signup failed. Please try again.'
      setError(errorMsg)
      console.error('Signup error:', err)
    } finally {
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
        <h1 style={{marginBottom: '2rem', textAlign: 'center'}}>⏱️ TimeClok Sign Up</h1>

        <form onSubmit={handleSignUp}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>I am a:</label>
            <select value={userType} onChange={(e) => setUserType(e.target.value as any)} style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '0.5rem'
            }}>
              <option value="owner">Owner</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {userType === 'owner' && (
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Company Name</label>
              <input 
                type="text" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{marginBottom: '1.5rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 0, 110, 0.2)',
              color: '#ff006e',
              padding: '0.75rem',
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
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <button 
            type="button"
            onClick={() => router.push('/auth/login')}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              color: '#00d9ff',
              border: '2px solid #00d9ff',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Already have an account? Log in
          </button>
        </form>
      </div>
    </div>
  )
}
