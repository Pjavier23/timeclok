'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoPage() {
  const router = useRouter()

  useEffect(() => {
    // Set demo user in localStorage
    localStorage.setItem('demo_logged_in', 'true')
    localStorage.setItem('demo_email', 'demo@timeclok.test')
    localStorage.setItem('demo_userType', 'owner')
    localStorage.setItem('demo_company', 'Demo Company')

    // Redirect to dashboard
    router.push('/owner/dashboard')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0f1f',
      color: '#fff'
    }}>
      <h1>Loading demo...</h1>
    </div>
  )
}
