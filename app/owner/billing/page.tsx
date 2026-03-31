'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { computeBillingStatus, BillingInfo } from '../../lib/billing'
import { Suspense } from 'react'

function BillingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState<any>(null)
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }

    const res = await fetch('/api/owner/data', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { router.push('/owner/dashboard'); return }
    const data = await res.json()
    setCompany(data.company)

    // Compute billing status from company data
    if (data.company) {
      const info = computeBillingStatus(data.company.subscription_status, data.company.trial_ends_at)
      setBilling(info)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle billing=success query param
  useEffect(() => {
    if (searchParams.get('billing') === 'success') {
      setSuccessBanner(true)
      // Refresh data after short delay (webhook might not have fired yet)
      setTimeout(() => fetchData(), 2500)
      // Auto-hide success banner after 8s
      setTimeout(() => setSuccessBanner(false), 8000)
    }
  }, [searchParams])

  const handleUpgrade = async () => {
    setActionLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create checkout session')
      setActionLoading(false)
      return
    }
    if (data.url) window.location.href = data.url
  }

  const handlePortal = async () => {
    setActionLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to open billing portal')
      setActionLoading(false)
      return
    }
    if (data.url) window.location.href = data.url
  }

  const FEATURES = [
    { icon: '📍', label: 'GPS Time Tracking', desc: 'Clock in/out with location verification' },
    { icon: '👥', label: 'Unlimited Employees', desc: 'Invite and manage your entire team' },
    { icon: '💰', label: 'Auto Payroll', desc: 'Automatic payroll with W2 & 1099 support' },
    { icon: '🐷', label: 'Tax Reserve', desc: 'Auto-set aside taxes for 1099 contractors' },
    { icon: '📊', label: 'CSV Export', desc: 'Export time entries & payroll data anytime' },
    { icon: '📱', label: 'Mobile-First', desc: 'Works perfectly on any device' },
    { icon: '✉️', label: 'Email Invites', desc: 'Email and SMS invite links for employees' },
    { icon: '🔒', label: 'Secure & Reliable', desc: 'Bank-grade security, 99.9% uptime' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</div>
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING BILLING</div>
        </div>
      </div>
    )
  }

  const isActive = billing?.status === 'active'
  const isTrial = billing?.status === 'trial'
  const isExpired = billing?.status === 'trial_expired' || billing?.status === 'cancelled' || billing?.status === 'past_due'
  const daysLeft = billing?.daysLeft ?? 0
  const isUrgent = isTrial && daysLeft <= 3

  // Trial end date display
  let trialEndDisplay = ''
  if (billing?.trialEndsAt) {
    trialEndDisplay = new Date(billing.trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' } as React.CSSProperties}>
      {/* Header */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⏱</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
        </div>
        <button
          onClick={() => router.push('/owner/dashboard')}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
        >
          ← Dashboard
        </button>
      </header>

      {/* Success Banner */}
      {successBanner && (
        <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(0,217,255,0.1))', borderBottom: '1px solid rgba(34,197,94,0.3)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <div>
            <span style={{ fontWeight: '800', color: '#22c55e', fontSize: '1rem' }}>Welcome to TimeClok Pro!</span>
            <span style={{ color: '#aaa', marginLeft: '0.5rem', fontSize: '0.9rem' }}>You're all set — enjoy full access.</span>
          </div>
          <button onClick={() => setSuccessBanner(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }}>✕</button>
        </div>
      )}

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem 4rem' : '3rem 2rem' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', margin: '0 0 0.75rem', letterSpacing: '-0.03em' }}>
            {isActive ? '✅ Your Subscription' : isExpired ? '🔒 Trial Expired' : '⚡ Upgrade to Pro'}
          </h1>
          <p style={{ margin: 0, color: '#555', fontSize: '1rem', lineHeight: 1.6 }}>
            {isActive
              ? 'Thank you for being a TimeClok Pro member.'
              : isExpired
              ? 'Subscribe to regain full access to TimeClok.'
              : 'Everything you need to run payroll and track your team.'}
          </p>
        </div>

        {/* Trial Status Banner */}
        {isTrial && (
          <div style={{
            background: isUrgent ? 'rgba(239,68,68,0.08)' : daysLeft <= 7 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : daysLeft <= 7 ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>
              {isUrgent ? '⚠️' : daysLeft <= 7 ? '🕐' : '✅'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isUrgent ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#22c55e' }}>
                {isUrgent
                  ? `Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left on your trial`
                  : `${daysLeft} days left on your free trial`}
              </div>
              {trialEndDisplay && (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                  Trial ends {trialEndDisplay}
                </div>
              )}
            </div>
            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              style={{ background: isUrgent ? '#ef4444' : '#00d9ff', color: '#000', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', opacity: actionLoading ? 0.7 : 1 } as React.CSSProperties}
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* Expired Banner */}
        {isExpired && !isActive && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#ef4444' }}>
                {billing?.status === 'past_due' ? 'Payment failed — update your billing info' : 'Your trial has expired'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>Subscribe below to restore full access.</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Plan Card */}
        <div style={{
          background: isActive
            ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(0,217,255,0.05))'
            : isExpired
            ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.04))'
            : 'linear-gradient(135deg, rgba(0,217,255,0.06), rgba(0,153,204,0.04))',
          border: isActive
            ? '1px solid rgba(34,197,94,0.25)'
            : isExpired
            ? '1px solid rgba(239,68,68,0.2)'
            : '1px solid rgba(0,217,255,0.25)',
          borderRadius: '20px',
          padding: isMobile ? '1.5rem' : '2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {isActive && (
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#22c55e', color: '#000', padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active
            </div>
          )}
          {isTrial && (
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: isUrgent ? '#ef4444' : '#f59e0b', color: '#000', padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Trial
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              TimeClok Pro
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: '900', color: '#fff', lineHeight: 1 }}>$99</span>
              <span style={{ fontSize: '1rem', color: '#555' }}>/month</span>
            </div>
            <p style={{ margin: '0.75rem 0 0', color: '#666', fontSize: '0.875rem' }}>Cancel anytime. No long-term contracts.</p>
          </div>

          {isActive ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handlePortal}
                disabled={actionLoading}
                style={{ flex: 1, minWidth: '160px', padding: '0.875rem 1.5rem', background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.3)', color: '#00d9ff', borderRadius: '12px', fontWeight: '700', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? '⏳ Loading...' : '⚙️ Manage Subscription'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              style={{ width: '100%', padding: '1rem 2rem', background: actionLoading ? 'rgba(0,217,255,0.4)' : '#00d9ff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '1.05rem', letterSpacing: '-0.01em', transition: 'all 0.2s' }}
            >
              {actionLoading ? '⏳ Redirecting to Checkout...' : 'Start Subscription → $99/mo'}
            </button>
          )}
        </div>

        {/* Features grid */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' }}>Everything Included</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.875rem' }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.2rem' }}>{f.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' }}>Common Questions</h3>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel through the customer portal with one click. No penalties, no questions asked.' },
            { q: 'What payment methods do you accept?', a: 'All major credit and debit cards via Stripe. Secure, encrypted payments.' },
            { q: 'Do you offer discounts?', a: 'Yes — ask Pedro for a promo code. Enter it at checkout for a discount.' },
            { q: 'What happened to my 30-day trial?', a: 'Your free trial gives you full access for 30 days. After that, subscribe for $99/mo to keep all features.' },
          ].map((faq, i, arr) => (
            <div key={faq.q} style={{ marginBottom: i < arr.length - 1 ? '1rem' : 0, paddingBottom: i < arr.length - 1 ? '1rem' : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontWeight: '700', marginBottom: '0.3rem', fontSize: '0.9rem' }}>{faq.q}</div>
              <div style={{ color: '#666', fontSize: '0.85rem', lineHeight: 1.5 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Support */}
        <div style={{ textAlign: 'center', padding: '1rem', color: '#444', fontSize: '0.85rem' }}>
          Questions? Email <a href="mailto:pedro@jastheshop.com" style={{ color: '#00d9ff', textDecoration: 'none', fontWeight: '600' }}>pedro@jastheshop.com</a>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</div>
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING</div>
        </div>
      </div>
    }>
      <BillingPageInner />
    </Suspense>
  )
}
