'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '2rem' }}>⏱️ TimeClok</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px' }}>
        Employee time tracking & payroll management
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <button
          onClick={() => {
            localStorage.setItem('demo_mode', 'true')
            localStorage.setItem('user_type', 'owner')
            router.push('/owner/dashboard')
          }}
          style={{
            background: '#00d9ff',
            color: '#000',
            border: 'none',
            padding: '2rem',
            borderRadius: '1rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          👔 Owner Demo
        </button>

        <button
          onClick={() => {
            localStorage.setItem('demo_mode', 'true')
            localStorage.setItem('user_type', 'employee')
            router.push('/employee/dashboard')
          }}
          style={{
            background: '#ff006e',
            color: '#fff',
            border: 'none',
            padding: '2rem',
            borderRadius: '1rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          👤 Employee Demo
        </button>
      </div>

      <p style={{ color: '#666' }}>Click either button to see the demo</p>
    </div>
  )
}
