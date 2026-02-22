'use client'

import { useState } from 'react'

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSeed = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Seeding failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error seeding demo account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        borderRadius: '1.5rem',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>
          ⏱️ TimeClok Demo
        </h1>

        <p style={{ color: '#999', marginBottom: '2rem', fontSize: '1.125rem' }}>
          One-click setup for demo owner account with sample payroll data
        </p>

        {!result ? (
          <>
            <button
              onClick={handleSeed}
              disabled={loading}
              style={{
                width: '100%',
                background: '#00d9ff',
                color: '#000',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: '1rem',
              }}
            >
              {loading ? '⏳ Seeding Demo Account...' : '🌱 Seed Demo Account'}
            </button>

            {error && (
              <div style={{
                background: 'rgba(255, 0, 110, 0.2)',
                color: '#ff006e',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                marginTop: '1rem',
              }}>
                ❌ {error}
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: 'rgba(100, 200, 100, 0.2)',
            border: '1px solid rgba(100, 200, 100, 0.5)',
            color: '#64c864',
            padding: '2rem',
            borderRadius: '0.75rem',
            marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              {result.message}
            </h2>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                📧 <strong>Email:</strong> {result.credentials.email}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                🔐 <strong>Password:</strong> {result.credentials.password}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                ✅ <strong>Employee:</strong> 1 (John Doe)
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                ⏰ <strong>Hours:</strong> {result.data.time_entry}
              </div>
              <div>
                💰 <strong>Payroll:</strong> {result.data.payroll}
              </div>
            </div>
            <a
              href={result.credentials.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#00d9ff',
                color: '#000',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: '700',
                marginRight: '1rem',
              }}
            >
              🚀 Go to TimeClok
            </a>
            <button
              onClick={() => { setResult(null); setError(''); }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              🔄 Seed Another
            </button>
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#666',
          fontSize: '0.875rem',
        }}>
          <p>After seeding, you'll have a complete demo with:</p>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>✅ Owner dashboard access</li>
            <li>✅ 1 sample employee</li>
            <li>✅ 8 hours time entry</li>
            <li>✅ $600 pending payroll</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
