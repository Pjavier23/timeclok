'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [lang, setLang] = useState<'en' | 'es'>('en')

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1f 0%, #1a1f3a 100%)',
      minHeight: '100vh',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Language Toggle */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        display: 'flex',
        gap: '0.5rem'
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
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Español
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '1rem' }}>
            ⏱️ TimeClok
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#aaa', marginBottom: '3rem' }}>
            {lang === 'en'
              ? 'Time tracking & payroll for modern teams. Clock in, get paid, stay organized.'
              : 'Seguimiento de tiempo y nómina para equipos modernos.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Owner Demo */}
            <button
              onClick={() => {
                localStorage.setItem('demo_mode', 'true')
                localStorage.setItem('user_type', 'owner')
                localStorage.setItem('user_email', 'demo@timeclok.test')
                localStorage.setItem('company_name', 'Demo Company')
                router.push('/owner/dashboard')
              }}
              style={{
                background: '#00d9ff',
                color: '#000',
                border: 'none',
                padding: '2rem 1rem',
                borderRadius: '1rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              👔 {lang === 'en' ? 'Owner Demo' : 'Demo Propietario'}
            </button>

            {/* Employee Demo */}
            <button
              onClick={() => {
                localStorage.setItem('demo_mode', 'true')
                localStorage.setItem('user_type', 'employee')
                localStorage.setItem('user_email', 'john@timeclok.test')
                localStorage.setItem('employee_name', 'John Doe')
                router.push('/employee/dashboard')
              }}
              style={{
                background: '#ff006e',
                color: '#fff',
                border: 'none',
                padding: '2rem 1rem',
                borderRadius: '1rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              👤 {lang === 'en' ? 'Employee Demo' : 'Demo Empleado'}
            </button>
          </div>

          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            {lang === 'en'
              ? 'Click either button to explore the full platform with demo data.'
              : 'Haz clic en cualquier botón para explorar la plataforma completa.'}
          </p>
        </div>
      </div>
    </div>
  )
}
