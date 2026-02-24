'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const features = [
    { icon: '⏱', title: 'Clock In / Out', desc: 'One tap from any device. GPS location auto-captured.' },
    { icon: '💰', title: 'Auto Payroll', desc: 'Hours × rate calculated instantly. Approve with one click.' },
    { icon: '🐷', title: 'Tax Reserve', desc: 'Set aside $25/check for taxes. Never get surprised at year-end.' },
    { icon: '✉️', title: 'Email Invites', desc: 'Add employees by email. They join in under a minute.' },
    { icon: '📍', title: 'Geolocation', desc: 'Know where your team clocked in. Every entry logged.' },
    { icon: '📥', title: 'CSV Exports', desc: 'Download payroll and earnings reports anytime.' },
  ]

  const steps = [
    { n: '1', title: 'Sign up as Owner', desc: 'Create your account and company in 30 seconds.' },
    { n: '2', title: 'Invite your team', desc: 'Enter employee emails — they get a link to join instantly.' },
    { n: '3', title: 'They clock in', desc: 'Employees tap Clock In from their phone. You see it live.' },
    { n: '4', title: 'Approve & pay', desc: 'Review hours, approve payroll, done.' },
  ]

  const faqs = [
    { q: 'Does it work on mobile?', a: 'Yes. TimeClok is fully responsive — works on any phone, tablet, or computer without installing anything.' },
    { q: 'What about 1099 contractors?', a: 'Fully supported. The tax reserve feature was built specifically for contractors who need to set money aside for quarterly/annual taxes.' },
    { q: 'How do employees join?', a: 'You enter their email in your dashboard. They get a link, create a password, and they\'re in — no IT required.' },
    { q: 'Can I export for my accountant?', a: 'Yes. Both payroll and earnings export to CSV with one click, ready for any accounting software.' },
  ]

  const copyDemo = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky' as const, top: 0, background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#00d9ff' }}>⏱ TimeClok</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="#pricing" style={{ color: '#999', fontSize: '0.875rem', textDecoration: 'none', fontWeight: '500' }}>Pricing</a>
          <button onClick={() => router.push('/auth/login')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
            Log In
          </button>
          <button onClick={() => router.push('/auth/signup')} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.5rem 1.125rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '5rem 2rem 4rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.25)', color: '#00d9ff', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
          TIME TRACKING FOR SMALL TEAMS
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '900', lineHeight: 1.1, margin: '0 0 1.5rem', letterSpacing: '-0.02em' }}>
          Simple payroll for<br />
          <span style={{ background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            teams that work hard
          </span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#999', lineHeight: 1.7, margin: '0 0 2.5rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Clock in with GPS, track hours automatically, send paychecks in one click. Built for contractors, field workers, and small businesses.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <button onClick={() => router.push('/auth/signup')} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '1rem 2rem', borderRadius: '10px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer' }}>
            Start Free Trial →
          </button>
          <button onClick={() => router.push('/auth/login')} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', padding: '1rem 2rem', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>

        {/* Demo credentials */}
        <div style={{ display: 'inline-block', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem 1.5rem', textAlign: 'left' as const }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Try the live demo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#00d9ff', fontWeight: '600', marginBottom: '0.25rem' }}>👔 Owner</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace' }}>demo.owner@timeclok.com</div>
              <div style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' }}>Demo1234!</div>
              <button onClick={() => router.push('/auth/login')} style={{ marginTop: '0.5rem', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                Open →
              </button>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600', marginBottom: '0.25rem' }}>👤 Employee</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace' }}>demo.employee@timeclok.com</div>
              <div style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' }}>Demo1234!</div>
              <button onClick={() => router.push('/auth/login')} style={{ marginTop: '0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                Open →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem' }}>Everything you need. Nothing you don't.</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '3rem', fontSize: '1rem' }}>Built for real businesses that need payroll done right.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.375rem' }}>{f.title}</div>
              <div style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '4rem 2rem', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: '800', marginBottom: '3rem' }}>Up and running in minutes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {steps.map(s => (
              <div key={s.n} style={{ textAlign: 'center' as const }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.1rem', fontWeight: '800', color: '#00d9ff' }}>{s.n}</div>
                <div style={{ fontWeight: '700', marginBottom: '0.375rem' }}>{s.title}</div>
                <div style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '5rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' as const }}>
        <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
          SIMPLE PRICING
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem' }}>One plan. No surprises.</h2>
        <p style={{ color: '#666', marginBottom: '3rem', fontSize: '1rem' }}>Everything included. Cancel anytime.</p>

        <div style={{ background: '#1a1a1a', border: '2px solid rgba(0,217,255,0.3)', borderRadius: '20px', padding: '3rem 2.5rem', maxWidth: '420px', margin: '0 auto', position: 'relative' as const }}>
          <div style={{ position: 'absolute' as const, top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#00d9ff', color: '#000', padding: '0.3rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap' as const }}>
            MOST POPULAR
          </div>
          <div style={{ fontSize: '0.875rem', color: '#999', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Per Company</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#00d9ff', marginTop: '0.5rem' }}>$</span>
            <span style={{ fontSize: '5rem', fontWeight: '900', lineHeight: 1, color: '#00d9ff' }}>99</span>
            <span style={{ fontSize: '1rem', color: '#666', alignSelf: 'flex-end', marginBottom: '0.75rem', marginLeft: '0.25rem' }}>/mo</span>
          </div>
          <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '2rem' }}>Up to 50 employees included</div>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' as const }}>
            {['Unlimited clock-ins & clock-outs', 'GPS location tracking', 'Auto payroll calculation', 'Email employee invites', 'Tax reserve feature', 'CSV payroll exports', 'Up to 50 employees'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#22c55e', fontWeight: '700', flexShrink: 0 }}>✓</span>
                <span style={{ color: '#ccc' }}>{item}</span>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/auth/signup')} style={{ width: '100%', padding: '1rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer' }}>
            Start Free Trial →
          </button>
          <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '1rem' }}>No credit card required to start</div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '4rem 2rem', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: '800', marginBottom: '3rem' }}>Common questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>
            {faqs.map(f => (
              <div key={f.q} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{f.q}</div>
                <div style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center' as const }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1rem' }}>Ready to simplify payroll?</h2>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1rem' }}>Join teams already using TimeClok to save hours every week.</p>
        <button onClick={() => router.push('/auth/signup')} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '1rem 2.5rem', borderRadius: '10px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer' }}>
          Get Started Free →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '1rem', color: '#555', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: '700', color: '#00d9ff' }}>⏱ TimeClok</div>
        <div>© 2026 TimeClok. Built for the people who build things.</div>
      </footer>

    </div>
  )
}
