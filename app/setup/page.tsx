'use client'

import { useState } from 'react'

export default function SetupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    ownerName: '',
    token: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/create-business-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      setResult({
        ...data,
        quickLoginUrl: `/login-redirect?email=${encodeURIComponent(formData.email)}&password=${encodeURIComponent(formData.password)}`
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#fff',
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>
          ⏱️ TimeClok Business Setup
        </h1>

        {result ? (
          <div style={{
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid #00d9ff',
            borderRadius: '1rem',
            padding: '1.5rem'
          }}>
            <h2 style={{ color: '#00d9ff', marginBottom: '1rem' }}>✅ Account Created!</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#00d9ff', marginBottom: '0.5rem' }}>Login Credentials:</h3>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Email:</strong> {result.account.email}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Password:</strong> {result.account.password}
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Company:</strong> {result.account.companyName}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#00d9ff', marginBottom: '0.5rem' }}>Setup Instructions:</h3>
              <ol style={{ marginLeft: '1.5rem' }}>
                <li>Go to <strong>{result.account.loginUrl}</strong></li>
                <li>Enter the email and password above</li>
                <li>You'll see the Owner Dashboard with 3 sample employees</li>
                <li>Click "Add Employee" to invite your real team</li>
                <li>They'll receive invite links to join</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.href = result.quickLoginUrl}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#00d9ff',
                color: '#000',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              ⚡ Go to Dashboard (Instant Login)
            </button>

            <button
              onClick={() => window.location.href = result.account.loginUrl}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: '#00d9ff',
                border: '2px solid #00d9ff',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Manual Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Admin Token</label>
              <input
                type="password"
                placeholder="timeclok-setup-2024"
                value={formData.token}
                onChange={(e) => setFormData({...formData, token: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Company Name</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Owner Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.ownerName}
                onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
              <input
                type="email"
                placeholder="owner@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
              <input
                type="password"
                placeholder="StrongPass123!"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 0, 110, 0.2)',
                color: '#ff006e',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
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
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Creating Account...' : 'Create Business Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
