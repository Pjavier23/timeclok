'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Language, translations, getTranslation } from './i18n'
import { createClient } from './lib/supabase'

// Client-side Supabase auth integration

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  
  const [lang, setLang] = useState<Language>('en')
  const [screen, setScreen] = useState<'landing' | 'login' | 'signup' | 'company'>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [userType, setUserType] = useState<'owner' | 'employee' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = (key: keyof typeof translations.en) => getTranslation(lang, key)

  const handleOwnerSignup = async () => {
    if (!email || !companyName) {
      setError('Please fill in email and company name')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companyName,
          userType: 'owner'
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Signup failed')
      
      if (data.magicLink) {
        alert(`✅ Magic link generated!\n\nLink: ${data.magicLink}\n\nCopy and open in your browser!`)
        window.location.href = data.magicLink
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSignup = async () => {
    if (!email) {
      setError('Please enter your email')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          userType: 'employee'
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Signup failed')
      
      if (data.magicLink) {
        alert(`✅ Magic link generated!\n\nLink: ${data.magicLink}\n\nCopy and open in your browser!`)
        window.location.href = data.magicLink
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Login failed')
      
      const userType = data.userType || 'owner'
      router.push(userType === 'employee' ? '/employee/dashboard' : '/owner/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
      color: '#fff',
    }}>
      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '2rem',
        display: 'flex',
        gap: '0.5rem',
      }}>
        <button
          onClick={() => setLang('en')}
          style={{
            padding: '0.5rem 1rem',
            background: lang === 'en' ? '#00d9ff' : 'rgba(255, 255, 255, 0.1)',
            color: lang === 'en' ? '#000' : '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          English
        </button>
        <button
          onClick={() => setLang('es')}
          style={{
            padding: '0.5rem 1rem',
            background: lang === 'es' ? '#ff006e' : 'rgba(255, 255, 255, 0.1)',
            color: lang === 'es' ? '#fff' : '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Español
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          {/* Landing Page */}
          {screen === 'landing' && !userType && (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '1rem' }}>
                ⏱️ TimeClok
              </h1>
              <p style={{ fontSize: '1.25rem', color: '#bbb', marginBottom: '3rem' }}>
                {lang === 'en'
                  ? 'Time tracking & payroll for modern teams. Clock in, get paid, stay organized.'
                  : 'Seguimiento de tiempo y nómina para equipos modernos. Registra entrada, cobra, mantente organizado.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <button
                  onClick={() => { setUserType('owner'); setScreen('company') }}
                  style={{
                    background: '#00d9ff',
                    color: '#000',
                    border: 'none',
                    padding: '2rem 1rem',
                    borderRadius: '1rem',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: 'pointer',
                  }}
                >
                  👔 {lang === 'en' ? 'Owner' : 'Propietario'}
                </button>
                <button
                  onClick={() => { setUserType('employee'); setScreen('signup') }}
                  style={{
                    background: '#ff006e',
                    color: '#fff',
                    border: 'none',
                    padding: '2rem 1rem',
                    borderRadius: '1rem',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: 'pointer',
                  }}
                >
                  👤 {lang === 'en' ? 'Employee' : 'Empleado'}
                </button>
              </div>

              <p style={{ color: '#999', marginBottom: '1rem' }}>
                {lang === 'en' ? 'Already have an account?' : '¿Ya tienes una cuenta?'}
              </p>
              <button
                onClick={() => setScreen('login')}
                style={{
                  background: 'transparent',
                  color: '#00d9ff',
                  border: '2px solid #00d9ff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {t('login')}
              </button>
            </div>
          )}

          {/* Company Registration */}
          {screen === 'company' && userType === 'owner' && (
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
                {t('registerCompany')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <input
                  type="text"
                  placeholder={t('companyName')}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
                <input
                  type="email"
                  placeholder={t('email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              {error && <div style={{ color: '#ff006e', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              <button
                onClick={handleOwnerSignup}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#00d9ff',
                  color: '#000',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Generating Link...' : 'Get Magic Link'}
              </button>
              <button
                onClick={() => { setUserType(null); setScreen('landing'); setError('') }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#999',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                {t('back')}
              </button>
            </div>
          )}

          {/* Login */}
          {screen === 'login' && (
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
                {t('login')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <input
                  type="email"
                  placeholder={t('email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
                <input
                  type="password"
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              {error && <div style={{ color: '#ff006e', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#00d9ff',
                  color: '#000',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Logging in...' : t('login')}
              </button>
              <button
                onClick={() => { setScreen('landing'); setError('') }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#999',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                {t('back')}
              </button>
            </div>
          )}

          {/* Employee Signup */}
          {screen === 'signup' && userType === 'employee' && (
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
                {t('signup')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <input
                  type="email"
                  placeholder={t('email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              {error && <div style={{ color: '#ff006e', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              <button
                onClick={handleEmployeeSignup}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#ff006e',
                  color: '#fff',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Generating Link...' : 'Get Magic Link'}
              </button>
              <button
                onClick={() => { setUserType(null); setScreen('landing'); setError('') }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#999',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                {t('back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
