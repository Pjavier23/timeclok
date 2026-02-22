'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [lang, setLang] = useState<'en' | 'es'>('en')

  useEffect(() => {
    // Get saved language preference
    const saved = typeof window !== 'undefined' ? localStorage.getItem('timeclok_lang') : null
    if (saved === 'es' || saved === 'en') {
      setLang(saved)
    }
  }, [])

  const handleLangChange = (newLang: 'en' | 'es') => {
    setLang(newLang)
    localStorage.setItem('timeclok_lang', newLang)
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      minHeight: '100vh',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button onClick={() => handleLangChange('en')} style={{
          padding: '0.5rem 1rem',
          background: lang === 'en' ? '#00d9ff' : 'rgba(255,255,255,0.1)',
          color: lang === 'en' ? '#000' : '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontWeight: '600'
        }}>English</button>
        <button onClick={() => handleLangChange('es')} style={{
          padding: '0.5rem 1rem',
          background: lang === 'es' ? '#ff006e' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontWeight: '600'
        }}>Español</button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        <h1 style={{fontSize: '4rem', fontWeight: '900', marginBottom: '1rem'}}>
          ⏱️ TimeClok
        </h1>
        <p style={{fontSize: '1.25rem', color: '#aaa', marginBottom: '3rem', maxWidth: '600px'}}>
          {lang === 'en' 
            ? 'Employee time tracking & payroll management. Simple, transparent, secure.'
            : 'Seguimiento de tiempo y nómina para equipos modernos.'}
        </p>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem'}}>
          <button onClick={() => {
            localStorage.setItem('demo_mode', 'true')
            router.push('/owner/dashboard')
          }} style={{
            background: '#00d9ff',
            color: '#000',
            border: 'none',
            padding: '2rem',
            borderRadius: '1rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            👔 {lang === 'en' ? 'Owner Demo' : 'Demo Propietario'}
          </button>

          <button onClick={() => {
            localStorage.setItem('demo_mode', 'true')
            router.push('/employee/dashboard')
          }} style={{
            background: '#ff006e',
            color: '#fff',
            border: 'none',
            padding: '2rem',
            borderRadius: '1rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            👤 {lang === 'en' ? 'Employee Demo' : 'Demo Empleado'}
          </button>
        </div>

        <div style={{marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '600px'}}>
          <button onClick={() => router.push('/auth/signup')} style={{
            background: 'transparent',
            color: '#00d9ff',
            border: '2px solid #00d9ff',
            padding: '1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            {lang === 'en' ? 'Sign Up' : 'Registrarse'}
          </button>
          <button onClick={() => router.push('/auth/login')} style={{
            background: 'transparent',
            color: '#ff006e',
            border: '2px solid #ff006e',
            padding: '1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            {lang === 'en' ? 'Log In' : 'Iniciar Sesión'}
          </button>
        </div>

        <p style={{color: '#666', marginTop: '2rem', fontSize: '0.875rem'}}>
          {lang === 'en' 
            ? 'Demo accounts work instantly. Full app requires sign up.'
            : 'Las cuentas de demostración funcionan al instante.'}
        </p>
      </div>
    </div>
  )
}
