'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const S = {
    page: {
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    header: {
      padding: '1.25rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    logo: {
      fontSize: '1.4rem',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
    } as React.CSSProperties,
    hero: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
      padding: '4rem 2rem',
      maxWidth: '800px',
      margin: '0 auto',
    },
    badge: {
      display: 'inline-block',
      background: 'rgba(0,217,255,0.1)',
      border: '1px solid rgba(0,217,255,0.3)',
      color: '#00d9ff',
      padding: '0.35rem 1rem',
      borderRadius: '100px',
      fontSize: '0.8rem',
      fontWeight: '600',
      marginBottom: '2rem',
      letterSpacing: '0.05em',
    },
    h1: {
      fontSize: 'clamp(2.5rem, 6vw, 4rem)',
      fontWeight: '900',
      lineHeight: '1.1',
      marginBottom: '1.5rem',
      letterSpacing: '-0.02em',
    },
    sub: {
      fontSize: '1.2rem',
      color: '#666',
      maxWidth: '500px',
      lineHeight: '1.6',
      marginBottom: '3rem',
    },
    ctaRow: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      marginBottom: '4rem',
    },
    btnPrimary: {
      background: '#00d9ff',
      color: '#000',
      border: 'none',
      padding: '0.875rem 2rem',
      borderRadius: '8px',
      fontWeight: '700',
      fontSize: '1rem',
      cursor: 'pointer',
    },
    btnSecondary: {
      background: 'transparent',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.2)',
      padding: '0.875rem 2rem',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '1rem',
      cursor: 'pointer',
    },
    demoSection: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '2rem',
      width: '100%',
      maxWidth: '520px',
      marginBottom: '3rem',
    },
    demoTitle: {
      fontSize: '0.75rem',
      color: '#00d9ff',
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    demoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.875rem',
      borderRadius: '8px',
      marginBottom: '0.5rem',
    },
    features: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      width: '100%',
      maxWidth: '720px',
    },
    featureCard: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'left' as const,
    },
    featureIcon: { fontSize: '1.75rem', marginBottom: '0.75rem' },
    featureName: { fontWeight: '700', marginBottom: '0.375rem', fontSize: '0.95rem' },
    featureDesc: { color: '#555', fontSize: '0.8rem', lineHeight: '1.5' },
    footer: {
      textAlign: 'center' as const,
      padding: '2rem',
      color: '#333',
      fontSize: '0.8rem',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    },
  }

  const features = [
    { icon: '⏰', name: 'GPS Clock In/Out', desc: 'Track time with location data' },
    { icon: '💰', name: 'Payroll Management', desc: 'Approve and pay employees' },
    { icon: '👥', name: 'Team Invites', desc: 'Onboard employees with a link' },
    { icon: '📊', name: 'Dashboard', desc: 'Full visibility into your team' },
  ]

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.logo}>⏱ TimeClok</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => router.push('/auth/login')} style={{ ...S.btnSecondary, padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Sign In
          </button>
          <button onClick={() => router.push('/auth/signup')} style={{ ...S.btnPrimary, padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Get Started
          </button>
        </div>
      </header>

      <div style={S.hero}>
        <div style={S.badge}>✨ Employee Time Tracking & Payroll</div>

        <h2 style={S.h1}>
          Track time.
          <br />
          <span style={{ color: '#00d9ff' }}>Pay your team.</span>
          <br />
          Grow your business.
        </h2>

        <p style={S.sub}>
          Simple, modern time tracking for small businesses. Clock in with GPS, manage payroll, and invite employees — all in one place.
        </p>

        <div style={S.ctaRow}>
          <button onClick={() => router.push('/auth/signup')} style={S.btnPrimary}>
            Start for Free →
          </button>
          <button onClick={() => router.push('/auth/login')} style={S.btnSecondary}>
            Sign In
          </button>
        </div>

        {/* Demo credentials */}
        <div style={S.demoSection}>
          <div style={S.demoTitle}>🎯 Try it now — demo accounts</div>
          
          <div style={{ ...S.demoRow, background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.15)', cursor: 'pointer' }}
               onClick={() => router.push('/auth/login')}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#00d9ff', fontWeight: '700', marginBottom: '0.2rem' }}>OWNER</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>demo.owner@timeclok.com</div>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>Password: Demo1234!</div>
            </div>
            <div style={{ background: '#00d9ff', color: '#000', padding: '0.4rem 0.875rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
              Try →
            </div>
          </div>

          <div style={{ ...S.demoRow, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', cursor: 'pointer' }}
               onClick={() => router.push('/auth/login')}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700', marginBottom: '0.2rem' }}>EMPLOYEE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>demo.employee@timeclok.com</div>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>Password: Demo1234!</div>
            </div>
            <div style={{ background: '#22c55e', color: '#fff', padding: '0.4rem 0.875rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
              Try →
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={S.features}>
          {features.map((f) => (
            <div key={f.name} style={S.featureCard}>
              <div style={S.featureIcon}>{f.icon}</div>
              <div style={S.featureName}>{f.name}</div>
              <div style={S.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <footer style={S.footer}>
        © 2026 TimeClok — Built for small businesses
      </footer>
    </div>
  )
}
