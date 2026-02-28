'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function EmployeeDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'earnings'>('clock')
  const [data, setData] = useState<any>(null)
  const [clockLoading, setClockLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxAmount, setTaxAmount] = useState(25)
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxSaved, setTaxSaved] = useState(false)
  const [taxMigrationNeeded, setTaxMigrationNeeded] = useState(false)
  const [clockSuccess, setClockSuccess] = useState<'in' | 'out' | null>(null)

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  const fetchData = useCallback(async () => {
    const session = await getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    const res = await fetch('/api/employee/data', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.status === 401) {
      router.push('/auth/login')
      return
    }

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setData(json)
      setTaxEnabled(json.stats?.taxReserveEnabled ?? false)
      setTaxAmount(json.stats?.taxReservePerPeriod ?? 25)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Live timer
  useEffect(() => {
    if (data?.activeEntry) {
      const start = new Date(data.activeEntry.clock_in).getTime()
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
      tick()
      timerRef.current = setInterval(tick, 1000)
    } else {
      setElapsed(0)
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [data?.activeEntry])

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const estimatedEarnings = (secs: number) => {
    const rate = data?.stats?.hourlyRate ?? 0
    return ((secs / 3600) * rate).toFixed(2)
  }

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      )
    })
  }

  const handleClockIn = async () => {
    setClockLoading(true)
    setError('')
    setWarning('')

    const loc = await getLocation()
    if (!loc) setWarning('Location unavailable — clocking in without GPS')

    const session = await getSession()
    if (!session) return

    const res = await fetch('/api/employee/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'clock_in', lat: loc?.lat, lng: loc?.lng }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setClockSuccess('in')
      setTimeout(() => setClockSuccess(null), 3000)
      await fetchData()
    }
    setClockLoading(false)
  }

  const handleClockOut = async () => {
    setClockLoading(true)
    setError('')

    const session = await getSession()
    if (!session) return

    const res = await fetch('/api/employee/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'clock_out', entryId: data?.activeEntry?.id }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setClockSuccess('out')
      setTimeout(() => setClockSuccess(null), 3000)
      await fetchData()
    }
    setClockLoading(false)
  }

  const handleSaveTaxSettings = async () => {
    setTaxSaving(true)
    const session = await getSession()
    if (!session) return
    const res = await fetch('/api/employee/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tax_reserve_enabled: taxEnabled, tax_reserve_per_period: taxAmount }),
    })
    const json = await res.json()
    setTaxSaving(false)
    if (json.migration_needed) {
      setTaxMigrationNeeded(true)
    } else {
      setTaxSaved(true)
      setTaxMigrationNeeded(false)
      setTimeout(() => setTaxSaved(false), 3000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏱</div>
          <div style={{ color: '#555', fontSize: '0.875rem', letterSpacing: '0.05em' }}>LOADING</div>
        </div>
      </div>
    )
  }

  const { user, employee, timeEntries, payroll, activeEntry, stats } = data || {}
  const isClockedIn = !!activeEntry

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'there'

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ['#f59e0b', 'rgba(245,158,11,0.12)'],
      approved: ['#22c55e', 'rgba(34,197,94,0.12)'],
      paid: ['#00d9ff', 'rgba(0,217,255,0.12)'],
    }
    const [color, bg] = map[s] || ['#888', 'rgba(255,255,255,0.08)']
    return <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', color, background: bg }}>{s}</span>
  }

  const tabs = [
    { id: 'clock' as const, icon: '⏰', label: 'Clock In/Out' },
    { id: 'history' as const, icon: '📋', label: 'History' },
    { id: 'earnings' as const, icon: '💵', label: 'Earnings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#0c0c0c', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⏱</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isClockedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.3rem 0.75rem', borderRadius: '100px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block' }} />
              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '700', fontFamily: 'monospace' }}>{formatElapsed(elapsed)}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#555', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#555', padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#555' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Alerts */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}
        {warning && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            ⚡ {warning}
          </div>
        )}
        {clockSuccess && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
            {clockSuccess === 'in' ? '✓ Clocked in! Time is running.' : '✓ Clocked out! Entry saved.'}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '12px', padding: '0.25rem', marginBottom: '2rem', gap: '0.25rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.625rem 0.75rem',
                borderRadius: '9px',
                border: 'none',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#000' : '#555',
                fontWeight: activeTab === tab.id ? '800' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              } as React.CSSProperties}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── CLOCK TAB ── */}
        {activeTab === 'clock' && (
          <div>
            {/* Main clock card */}
            <div style={{
              background: '#1a1a1a',
              borderRadius: '20px',
              padding: '3rem 2rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
              position: 'relative',
              overflow: 'hidden',
            } as React.CSSProperties}>
              {/* Background gradient */}
              {isClockedIn && (
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(34,197,94,0.06) 0%, transparent 60%)', pointerEvents: 'none' } as React.CSSProperties} />
              )}

              <div style={{ position: 'relative', zIndex: 1 } as React.CSSProperties}>
                {/* Status indicator */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    borderRadius: '100px',
                    background: isClockedIn ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isClockedIn ? '#22c55e' : '#555', display: 'block' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isClockedIn ? '#22c55e' : '#666', letterSpacing: '0.04em' }}>
                      {isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                    </span>
                  </div>
                </div>

                {/* Greeting / timer */}
                {isClockedIn ? (
                  <div>
                    <div style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: '900', color: '#22c55e', letterSpacing: '0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
                      {formatElapsed(elapsed)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.5rem' }}>
                      Clocked in at {formatTime(activeEntry.clock_in)}
                    </div>
                    {stats?.hourlyRate > 0 && (
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#00d9ff', marginBottom: '0.5rem' }}>
                        +${estimatedEarnings(elapsed)} earned so far
                      </div>
                    )}
                    {activeEntry.latitude && (
                      <div style={{ fontSize: '0.8rem', color: '#444', marginBottom: '1.5rem' }}>
                        📍 {Number(activeEntry.latitude).toFixed(4)}, {Number(activeEntry.longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                      Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
                    </div>
                    <div style={{ fontSize: '1rem', color: '#555' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}

                {/* Big clock button */}
                <button
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  disabled={clockLoading}
                  style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    border: `3px solid ${isClockedIn ? '#ef4444' : '#22c55e'}`,
                    background: isClockedIn
                      ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)'
                      : 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
                    color: isClockedIn ? '#ef4444' : '#22c55e',
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    cursor: clockLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    margin: '0 auto',
                    boxShadow: isClockedIn
                      ? '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(239,68,68,0.05)'
                      : '0 0 40px rgba(34,197,94,0.2), inset 0 0 30px rgba(34,197,94,0.05)',
                    opacity: clockLoading ? 0.6 : 1,
                    letterSpacing: '0.04em',
                  } as React.CSSProperties}
                  onMouseEnter={e => {
                    if (!clockLoading) {
                      const btn = e.currentTarget as HTMLButtonElement
                      btn.style.transform = 'scale(1.04)'
                      btn.style.boxShadow = isClockedIn
                        ? '0 0 60px rgba(239,68,68,0.35), inset 0 0 40px rgba(239,68,68,0.08)'
                        : '0 0 60px rgba(34,197,94,0.35), inset 0 0 40px rgba(34,197,94,0.08)'
                    }
                  }}
                  onMouseLeave={e => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.transform = 'scale(1)'
                    btn.style.boxShadow = isClockedIn
                      ? '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(239,68,68,0.05)'
                      : '0 0 40px rgba(34,197,94,0.2), inset 0 0 30px rgba(34,197,94,0.05)'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{clockLoading ? '⏳' : isClockedIn ? '⏹' : '▶'}</span>
                  <span>{clockLoading ? '...' : isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}</span>
                </button>
              </div>
            </div>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'This Week', value: `${stats?.weeklyHours ?? 0}h`, color: '#00d9ff', icon: '📊' },
                { label: 'Hourly Rate', value: `$${(stats?.hourlyRate ?? 0).toFixed(2)}`, color: '#22c55e', icon: '💰' },
                { label: 'Total Earned', value: `$${(stats?.totalEarned ?? 0).toFixed(0)}`, color: '#f59e0b', icon: '🏦' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color, lineHeight: 1, marginBottom: '0.25rem' }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: '#444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.25rem', fontWeight: '800' }}>Time History</h2>
                <div style={{ fontSize: '0.8rem', color: '#555' }}>{timeEntries?.length ?? 0} entries</div>
              </div>
            </div>

            {!timeEntries?.length ? (
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏰</div>
                <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>No time entries yet</div>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>Clock in to start tracking your time.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {timeEntries.map((entry: any, i: number) => {
                  const isActive = !entry.clock_out
                  return (
                    <div
                      key={entry.id}
                      style={{ background: '#1a1a1a', border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget).style.borderColor = isActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Date</div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{formatDate(entry.clock_in)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Clock In</div>
                        <div style={{ fontSize: '0.875rem', color: '#aaa' }}>{formatTime(entry.clock_in)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Clock Out</div>
                        <div style={{ fontSize: '0.875rem', color: isActive ? '#22c55e' : '#aaa', fontWeight: isActive ? '700' : 'normal' }}>
                          {isActive ? '● Active' : formatTime(entry.clock_out)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Hours</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.25rem', fontWeight: '800' }}>Earnings</h2>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>Your pay summary</div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Hours', value: `${stats?.totalHours ?? 0}h`, color: '#22c55e', icon: '⏱' },
                { label: 'Gross Earned', value: `$${(stats?.totalGross ?? 0).toFixed(2)}`, color: '#00d9ff', icon: '💵' },
                { label: 'Tax Reserved 🐷', value: `$${(stats?.totalTaxReserved ?? 0).toFixed(2)}`, color: '#f59e0b', icon: '🏛' },
                { label: 'Net Pay', value: `$${(stats?.totalNet ?? 0).toFixed(2)}`, color: '#a78bfa', icon: '✨' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                    <span style={{ fontSize: '0.72rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '900', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tax reserve settings */}
            <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem' }}>🐷 Tax Reserve</div>
                  <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.15rem' }}>Set aside money each check for year-end taxes</div>
                </div>
                <button
                  onClick={() => setTaxEnabled(!taxEnabled)}
                  style={{ position: 'relative', width: '48px', height: '26px', background: taxEnabled ? '#22c55e' : 'rgba(255,255,255,0.12)', borderRadius: '100px', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 } as React.CSSProperties}
                >
                  <span style={{ position: 'absolute', top: '3px', left: taxEnabled ? '25px' : '3px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', display: 'block' } as React.CSSProperties} />
                </button>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ color: taxEnabled ? '#ccc' : '#555', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  {taxEnabled
                    ? '✅ Active — $' + taxAmount + ' will be set aside from each approved paycheck.'
                    : '💡 1099 contractors often owe 25–30% at year-end. Reserve a little each check to stay ahead.'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                    <span style={{ padding: '0.6rem 0.875rem', color: '#555', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: '0.9rem', fontWeight: '600' }}>$</span>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: '#fff', padding: '0.6rem 0.875rem', width: '80px', fontSize: '0.95rem', outline: 'none', fontWeight: '700' }}
                    />
                    <span style={{ padding: '0.6rem 0.875rem', color: '#555', borderLeft: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem' }}>/check</span>
                  </div>
                  <button
                    onClick={handleSaveTaxSettings}
                    disabled={taxSaving}
                    style={{ padding: '0.6rem 1.25rem', background: taxSaved ? 'rgba(34,197,94,0.15)' : 'rgba(0,217,255,0.1)', border: `1px solid ${taxSaved ? 'rgba(34,197,94,0.3)' : 'rgba(0,217,255,0.25)'}`, color: taxSaved ? '#22c55e' : '#00d9ff', borderRadius: '10px', cursor: taxSaving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: 'all 0.2s' }}
                  >
                    {taxSaved ? '✓ Saved!' : taxSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {taxMigrationNeeded && (
                  <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontSize: '0.8rem', color: '#ef4444' }}>
                    ⚙️ Feature coming soon — your admin is enabling this shortly.
                  </div>
                )}
              </div>
            </div>

            {/* Payroll records */}
            <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: '800', fontSize: '1rem' }}>Payroll Records</div>
              </div>
              {!payroll?.length ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#444', fontSize: '0.875rem' }}>No payroll records yet</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Week', 'Hrs', 'Gross', 'Tax', 'Net', 'Status'].map(h => (
                      <div key={h} style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                    ))}
                  </div>
                  {payroll.map((pr: any, i: number) => {
                    const gross = pr.total_amount || 0
                    const taxWithheld = pr.tax_withheld || 0
                    const net = pr.net_amount ?? gross
                    return (
                      <div
                        key={pr.id}
                        style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < payroll.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', fontSize: '0.875rem', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                      >
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>{pr.week_ending}</div>
                        <div style={{ color: '#aaa' }}>{pr.total_hours}h</div>
                        <div style={{ color: '#aaa' }}>${gross.toFixed(2)}</div>
                        <div style={{ color: taxWithheld > 0 ? '#f59e0b' : '#444' }}>
                          {taxWithheld > 0 ? `$${taxWithheld.toFixed(2)}` : '—'}
                        </div>
                        <div style={{ fontWeight: '800', color: '#22c55e' }}>${net.toFixed(2)}</div>
                        <div>{statusBadge(pr.status)}</div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
