'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LanguageToggle } from './components/LanguageToggle'
import { useLang } from './contexts/LanguageContext'

export default function Home() {
  const router = useRouter()
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: '⏱', title: t.feat1_title, desc: t.feat1_desc, color: '#00d9ff' },
    { icon: '💰', title: t.feat2_title, desc: t.feat2_desc, color: '#22c55e' },
    { icon: '🐷', title: t.feat3_title, desc: t.feat3_desc, color: '#f59e0b' },
    { icon: '📍', title: t.feat4_title, desc: t.feat4_desc, color: '#a78bfa' },
    { icon: '✉️', title: t.feat5_title, desc: t.feat5_desc, color: '#f472b6' },
    { icon: '📥', title: t.feat6_title, desc: t.feat6_desc, color: '#34d399' },
  ]

  const steps = [
    { n: '1', title: t.step1_title, desc: t.step1_desc, color: '#00d9ff' },
    { n: '2', title: t.step2_title, desc: t.step2_desc, color: '#22c55e' },
    { n: '3', title: t.step3_title, desc: t.step3_desc, color: '#f59e0b' },
    { n: '4', title: t.step4_title, desc: t.step4_desc, color: '#a78bfa' },
  ]

  const testimonials = [
    { quote: t.test1_quote, name: 'Maria G.', role: 'Owner, MG Cleaning Services', avatar: '👩‍💼' },
    { quote: t.test2_quote, name: 'James R.', role: 'General Contractor', avatar: '👨‍🔧' },
    { quote: t.test3_quote, name: 'David L.', role: 'Restaurant Owner', avatar: '👨‍🍳' },
  ]

  const faqs = [
    { q: t.faq1_q, a: t.faq1_a },
    { q: t.faq2_q, a: t.faq2_a },
    { q: t.faq3_q, a: t.faq3_a },
    { q: t.faq4_q, a: t.faq4_a },
    { q: t.faq5_q, a: t.faq5_a },
  ]

  const pricingFeatures = [
    t.feat1_title,
    t.feat4_title,
    t.feat2_title,
    t.step4_title,
    t.feat5_title,
    t.feat3_title,
    t.feat6_title,
    'Up to 50 employees',
    'Mobile + desktop',
    'Priority support',
  ]

  return (
    <div style={{ background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: scrolled ? 'rgba(15,15,15,0.97)' : 'rgba(15,15,15,0.8)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⏱</span>
          <span style={{ fontSize: '1.25rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href="#pricing" style={{ color: '#888', fontSize: '0.875rem', textDecoration: 'none', fontWeight: '500', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>{t.nav_pricing}</a>
          <LanguageToggle />
          <button
            onClick={() => router.push('/auth/login')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', padding: '0.5rem 1.125rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.target as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.target as HTMLButtonElement).style.color = '#ccc' }}
          >
            {t.nav_login}
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '800', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#33e3ff' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#00d9ff' }}
          >
            {t.nav_start}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(4rem, 10vw, 7rem) 2rem 3rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto', position: 'relative' } as React.CSSProperties}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(0,217,255,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 } as React.CSSProperties} />
        <div style={{ position: 'relative', zIndex: 1 } as React.CSSProperties}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '2rem', letterSpacing: '0.04em' }}>
            <span style={{ width: '6px', height: '6px', background: '#00d9ff', borderRadius: '50%' }} />
            {t.hero_badge}
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: '900', lineHeight: 1.08, margin: '0 0 1.5rem', letterSpacing: '-0.03em' }}>
            {t.hero_h1a}<br />
            <span style={{ background: 'linear-gradient(135deg, #00d9ff 0%, #0080ff 50%, #00d9ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%' } as React.CSSProperties}>
              {t.hero_h1b}
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#888', lineHeight: 1.75, margin: '0 0 2.5rem', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
            {t.hero_sub}
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              onClick={() => router.push('/auth/signup')}
              style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '1rem 2.25rem', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 0 40px rgba(0,217,255,0.3)', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.target as HTMLButtonElement).style.boxShadow = '0 4px 50px rgba(0,217,255,0.45)' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'none'; (e.target as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(0,217,255,0.3)' }}
            >
              {t.hero_cta_primary}
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              style={{ background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.12)', padding: '1rem 2.25rem', borderRadius: '12px', fontWeight: '600', fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
            >
              {t.hero_cta_secondary}
            </button>
          </div>

          <div style={{ color: '#555', fontSize: '0.8rem' }}>{t.hero_fine}</div>
        </div>
      </section>

      {/* ── SOCIAL PROOF NUMBERS ── */}
      <section style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {[
            { num: '12,000+', label: t.stat_clockins },
            { num: '$2.4M+', label: t.stat_payroll },
            { num: '500+', label: t.stat_teams },
            { num: '3 min', label: t.stat_setup },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '900', color: '#fff', marginBottom: '0.25rem' }}>{stat.num}</div>
              <div style={{ fontSize: '0.8rem', color: '#555', fontWeight: '500' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.dash_h2}</h2>
          <p style={{ color: '#666', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>{t.dash_sub}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', position: 'relative' } as React.CSSProperties}>
          <div style={{ background: '#1a1a1a', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', opacity: 0.7 }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', opacity: 0.7 }} />
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#555', textAlign: 'center', maxWidth: '300px', margin: '0 auto' }}>
              timeclok.com/owner/dashboard
            </div>
          </div>
          <div style={{ padding: '1.5rem', background: '#0f0f0f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#00d9ff', fontSize: '1.1rem', fontWeight: '800' }}>⏱ TimeClok</span>
                <span style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: '#666' }}>Acme Corp</span>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #00d9ff, #0080ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>P</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Active Now', value: '3', color: '#22c55e' },
                { label: 'Hours This Week', value: '142h', color: '#00d9ff' },
                { label: 'Pending Payroll', value: '$3,840', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', borderTop: `2px solid ${s.color}` }}>
                  <div style={{ fontSize: '0.65rem', color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Who's Working Now</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Sarah M.', time: '2h 14m', status: 'clocked-in' },
                  { name: 'Carlos R.', time: '1h 45m', status: 'clocked-in' },
                  { name: 'Kat T.', time: '4h 02m', status: 'clocked-in' },
                  { name: 'Mike D.', time: 'Off today', status: 'off' },
                ].map(emp => (
                  <div key={emp.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: emp.status === 'clocked-in' ? '#22c55e' : '#555' }} />
                      <span style={{ fontSize: '0.8rem', color: emp.status === 'clocked-in' ? '#ccc' : '#555' }}>{emp.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: emp.status === 'clocked-in' ? '#22c55e' : '#444', fontWeight: '600' }}>{emp.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.feat_h2}</h2>
          <p style={{ color: '#666', fontSize: '1rem' }}>{t.feat_sub}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {features.map(f => (
            <div
              key={f.title}
              style={{ background: '#111', padding: '2rem', cursor: 'default', transition: 'background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#161616' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#111' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '1.25rem', border: `1px solid ${f.color}22` }}>
                {f.icon}
              </div>
              <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem', color: '#fff' }}>{f.title}</div>
              <div style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(180deg, transparent, rgba(0,217,255,0.03), transparent)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.how_h2}</h2>
            <p style={{ color: '#666', fontSize: '1rem' }}>{t.how_sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ textAlign: 'center', position: 'relative' } as React.CSSProperties}>
                {i < steps.length - 1 && (
                  <div style={{ position: 'absolute', top: '24px', left: '60%', width: '80%', height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' } as React.CSSProperties} />
                )}
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.1rem', fontWeight: '900', color: s.color }}>
                  {s.n}
                </div>
                <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{s.title}</div>
                <div style={{ color: '#666', fontSize: '0.8rem', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.test_h2}</h2>
          <p style={{ color: '#666', fontSize: '1rem' }}>{t.test_sub}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {testimonials.map(item => (
            <div key={item.name} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.75rem' }}>
              <div style={{ fontSize: '1.25rem', color: '#f59e0b', marginBottom: '1rem' }}>★★★★★</div>
              <p style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 1.5rem', fontStyle: 'italic' }}>"{item.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {item.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>{item.name}</div>
                  <div style={{ color: '#555', fontSize: '0.8rem' }}>{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '5rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' as const }}>
        <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
          {t.pricing_badge}
        </div>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.pricing_h2}</h2>
        <p style={{ color: '#666', marginBottom: '3rem', fontSize: '1rem' }}>{t.pricing_sub}</p>

        <div style={{ background: '#1a1a1a', border: '1px solid rgba(0,217,255,0.25)', borderRadius: '24px', padding: '3rem 2.5rem', position: 'relative', boxShadow: '0 0 60px rgba(0,217,255,0.08)' } as React.CSSProperties}>
          <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #00d9ff, #0080ff)', color: '#000', padding: '0.3rem 1.25rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap' } as React.CSSProperties}>
            ✦ {t.pricing_tag}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#00d9ff', verticalAlign: 'top', lineHeight: '4.5rem' }}>$</span>
            <span style={{ fontSize: '5.5rem', fontWeight: '900', lineHeight: 1, color: '#00d9ff' }}>99</span>
            <span style={{ color: '#555', fontSize: '1rem', marginLeft: '0.25rem' }}>{t.pricing_per}</span>
          </div>
          <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: '2.5rem' }}>{t.pricing_note}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2.5rem', textAlign: 'left' as const }}>
            {pricingFeatures.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem' }}>
                <span style={{ color: '#22c55e', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>✓</span>
                <span style={{ color: '#aaa', lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/auth/signup')}
            style={{ width: '100%', padding: '1.1rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 30px rgba(0,217,255,0.3)' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'none' }}
          >
            {t.pricing_cta}
          </button>
          <div style={{ color: '#444', fontSize: '0.8rem', marginTop: '1rem' }}>{t.pricing_fine}</div>
        </div>

        <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.75rem' }}>{t.pricing_compare}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { name: 'Homebase', price: '$99–$396/mo', note: 'Per location' },
              { name: 'Deputy', price: '$4.50/user/mo', note: 'Min 5 users' },
              { name: 'TimeClok', price: '$99 flat', note: 'All features ✓', highlight: true },
            ].map(c => (
              <div key={c.name} style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '8px', background: c.highlight ? 'rgba(0,217,255,0.06)' : 'transparent', border: c.highlight ? '1px solid rgba(0,217,255,0.15)' : 'none' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: c.highlight ? '#00d9ff' : '#888', marginBottom: '0.25rem' }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: c.highlight ? '#ccc' : '#555' }}>{c.price}</div>
                <div style={{ fontSize: '0.7rem', color: '#444', marginTop: '0.2rem' }}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '900', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>{t.faq_h2}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map(f => (
              <div key={f.q} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{f.q}</div>
                <div style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse at center, rgba(0,217,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' } as React.CSSProperties} />
        <div style={{ position: 'relative', zIndex: 1 } as React.CSSProperties}>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.03em' }}>{t.footer_cta_h2}</h2>
          <p style={{ color: '#666', marginBottom: '2.5rem', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 2.5rem' }}>{t.footer_cta_sub}</p>
          <button
            onClick={() => router.push('/auth/signup')}
            style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '1.1rem 2.75rem', borderRadius: '12px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 0 50px rgba(0,217,255,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.target as HTMLButtonElement).style.boxShadow = '0 4px 60px rgba(0,217,255,0.5)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'none'; (e.target as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(0,217,255,0.35)' }}
          >
            {t.footer_cta_btn}
          </button>
          <div style={{ color: '#444', fontSize: '0.8rem', marginTop: '1.25rem' }}>{t.footer_cta_fine}</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#444', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⏱</span>
          <span style={{ fontWeight: '800', color: '#00d9ff' }}>TimeClok</span>
        </div>
        <div>{t.footer_copy}</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/auth/login" style={{ color: '#444', textDecoration: 'none' }}>{t.nav_login}</a>
          <a href="/auth/signup" style={{ color: '#444', textDecoration: 'none' }}>{t.signup}</a>
          <a href="#pricing" style={{ color: '#444', textDecoration: 'none' }}>{t.nav_pricing}</a>
        </div>
      </footer>

      {/* Demo credentials - floating */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200 } as React.CSSProperties}>
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '0.78rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', minWidth: '220px' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{t.demo_label}</div>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: '#00d9ff', fontWeight: '600' }}>Owner: </span>
            <span style={{ color: '#888', fontFamily: 'monospace' }}>demo.owner@timeclok.com</span>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ color: '#22c55e', fontWeight: '600' }}>Employee: </span>
            <span style={{ color: '#888', fontFamily: 'monospace' }}>demo.employee@timeclok.com</span>
          </div>
          <div style={{ color: '#555', marginBottom: '0.75rem', fontFamily: 'monospace' }}>{t.demo_pass}</div>
          <button
            onClick={() => router.push('/auth/login')}
            style={{ width: '100%', padding: '0.5rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            {t.demo_btn}
          </button>
        </div>
      </div>
    </div>
  )
}
