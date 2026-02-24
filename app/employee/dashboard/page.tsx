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
  const [elapsed, setElapsed] = useState(0) // seconds since clock in
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxAmount, setTaxAmount] = useState(25)
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxSaved, setTaxSaved] = useState(false)

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

  // Live timer for active session
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

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
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
    if (!loc) {
      setWarning('⚠️ Location unavailable — clocking in without GPS')
    }

    const session = await getSession()
    if (!session) return

    const res = await fetch('/api/employee/clock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'clock_in', lat: loc?.lat, lng: loc?.lng }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'clock_out', entryId: data?.activeEntry?.id }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      await fetchData()
    }
    setClockLoading(false)
  }

  const handleSaveTaxSettings = async () => {
    setTaxSaving(true)
    const session = await getSession()
    if (!session) return
    await fetch('/api/employee/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tax_reserve_enabled: taxEnabled, tax_reserve_per_period: taxAmount }),
    })
    setTaxSaving(false)
    setTaxSaved(true)
    setTimeout(() => setTaxSaved(false), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const S = {
    page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as React.CSSProperties,
    header: {
      background: '#0f0f0f',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky' as const,
      top: 0,
      zIndex: 50,
    },
    logo: { fontSize: '1.4rem', fontWeight: '800', color: '#00d9ff', margin: 0 },
    content: { padding: '1.5rem', maxWidth: '860px', margin: '0 auto' },
    tabs: { display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    tab: (active: boolean) => ({
      padding: '0.75rem 1.5rem',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #00d9ff' : '2px solid transparent',
      color: active ? '#00d9ff' : '#666',
      fontWeight: active ? '700' : '500',
      cursor: 'pointer',
      marginBottom: '-1px',
      fontSize: '0.9rem',
    }) as React.CSSProperties,
    clockCard: (isClockedIn: boolean) => ({
      background: '#1a1a1a',
      border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: '12px',
      padding: '2.5rem',
      textAlign: 'center' as const,
      marginBottom: '1.5rem',
      boxShadow: isClockedIn ? '0 0 40px rgba(34,197,94,0.08)' : 'none',
    }),
    statusDot: (on: boolean) => ({
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: on ? '#22c55e' : '#ef4444',
      margin: '0 auto 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      boxShadow: on ? '0 0 30px rgba(34,197,94,0.4)' : '0 0 20px rgba(239,68,68,0.2)',
    }) as React.CSSProperties,
    timerDisplay: {
      fontFamily: 'monospace',
      fontSize: '3rem',
      fontWeight: '800',
      color: '#22c55e',
      letterSpacing: '0.05em',
      marginBottom: '0.5rem',
    },
    clockBtnIn: {
      background: '#22c55e',
      color: '#fff',
      border: 'none',
      padding: '1rem 3rem',
      borderRadius: '100px',
      fontWeight: '700',
      fontSize: '1.1rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
    },
    clockBtnOut: {
      background: '#ef4444',
      color: '#fff',
      border: 'none',
      padding: '1rem 3rem',
      borderRadius: '100px',
      fontWeight: '700',
      fontSize: '1.1rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
    },
    card: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    } as React.CSSProperties,
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
    statCard: (color: string) => ({
      background: '#1a1a1a',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: '12px',
      padding: '1.25rem',
      borderTop: `3px solid ${color}`,
    }) as React.CSSProperties,
    statLabel: { fontSize: '0.75rem', color: '#555', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    statValue: { fontSize: '2rem', fontWeight: '800' },
    entryRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: '0',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontSize: '0.875rem',
    },
    entryLabel: { fontSize: '0.7rem', color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase' as const },
    logoutBtn: {
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
    },
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ color: '#666' }}>Loading...</div>
        </div>
      </div>
    )
  }

  const { user, employee, timeEntries, payroll, activeEntry, stats } = data || {}
  const isClockedIn = !!activeEntry

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const statusBadge = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ['#f59e0b', 'rgba(245,158,11,0.1)'],
      approved: ['#22c55e', 'rgba(34,197,94,0.1)'],
      paid: ['#00d9ff', 'rgba(0,217,255,0.1)'],
    }
    const [color, bg] = map[s] || ['#999', 'rgba(255,255,255,0.1)']
    return <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '600', color, background: bg }}>{s}</span>
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.logo}>⏱ TimeClok</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '0.8rem' }}>{user?.email}</span>
          <button onClick={handleLogout} style={S.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <div style={S.content}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.875rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}
        {warning && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '0.875rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {warning}
          </div>
        )}

        {/* Tabs */}
        <div style={S.tabs}>
          {(['clock', 'history', 'earnings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={S.tab(activeTab === tab)}>
              {tab === 'clock' && '⏰ '}
              {tab === 'history' && '📋 '}
              {tab === 'earnings' && '💵 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── CLOCK TAB ── */}
        {activeTab === 'clock' && (
          <div>
            <div style={S.clockCard(isClockedIn)}>
              <div style={S.statusDot(isClockedIn)}>
                {isClockedIn ? '✓' : '○'}
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {isClockedIn ? 'You are clocked in' : 'You are clocked out'}
              </div>

              {isClockedIn && activeEntry && (
                <div>
                  <div style={S.timerDisplay}>{formatElapsed(elapsed)}</div>
                  <div style={{ color: '#555', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Since {formatTime(activeEntry.clock_in)}
                    {activeEntry.latitude && (
                      <span style={{ marginLeft: '0.75rem' }}>📍 {Number(activeEntry.latitude).toFixed(4)}, {Number(activeEntry.longitude).toFixed(4)}</span>
                    )}
                  </div>
                </div>
              )}

              {!isClockedIn && (
                <div style={{ color: '#555', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              )}

              <button
                onClick={isClockedIn ? handleClockOut : handleClockIn}
                disabled={clockLoading}
                style={{
                  ...(isClockedIn ? S.clockBtnOut : S.clockBtnIn),
                  opacity: clockLoading ? 0.6 : 1,
                  cursor: clockLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {clockLoading ? '...' : isClockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>

            {/* Quick stats */}
            <div style={S.statGrid}>
              <div style={S.statCard('#00d9ff')}>
                <div style={S.statLabel}>This Week</div>
                <div style={{ ...S.statValue, color: '#00d9ff' }}>{stats?.weeklyHours ?? 0}h</div>
              </div>
              <div style={S.statCard('#22c55e')}>
                <div style={S.statLabel}>Hourly Rate</div>
                <div style={{ ...S.statValue, color: '#22c55e' }}>${stats?.hourlyRate?.toFixed(2) ?? '0.00'}</div>
              </div>
              <div style={S.statCard('#f59e0b')}>
                <div style={S.statLabel}>Total Earned</div>
                <div style={{ ...S.statValue, color: '#f59e0b' }}>${stats?.totalEarned?.toFixed(2) ?? '0.00'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div>
            <div style={S.card}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: '700' }}>
                Time History ({timeEntries?.length ?? 0} entries)
              </div>
              {timeEntries?.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#555' }}>No entries yet. Clock in to get started.</div>
              ) : (
                <>
                  <div style={{ padding: '0.875rem 1.5rem', background: 'rgba(255,255,255,0.02)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0' }}>
                    {['Date', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                      <div key={h} style={{ fontSize: '0.7rem', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {timeEntries.map((entry: any) => (
                    <div key={entry.id} style={S.entryRow}>
                      <div>
                        <div style={S.entryLabel}>Date</div>
                        <div style={{ fontWeight: '500' }}>{formatDate(entry.clock_in)}</div>
                      </div>
                      <div>
                        <div style={S.entryLabel}>In</div>
                        <div>{formatTime(entry.clock_in)}</div>
                      </div>
                      <div>
                        <div style={S.entryLabel}>Out</div>
                        <div>{entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>● Active</span>}</div>
                      </div>
                      <div>
                        <div style={S.entryLabel}>Hours</div>
                        <div style={{ fontWeight: '600' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <div>
            {/* Summary stats */}
            <div style={S.statGrid}>
              <div style={S.statCard('#22c55e')}>
                <div style={S.statLabel}>Total Hours</div>
                <div style={{ ...S.statValue, color: '#22c55e' }}>{stats?.totalHours ?? 0}h</div>
              </div>
              <div style={S.statCard('#00d9ff')}>
                <div style={S.statLabel}>Gross Earned</div>
                <div style={{ ...S.statValue, color: '#00d9ff' }}>${stats?.totalGross?.toFixed(2) ?? '0.00'}</div>
              </div>
              <div style={S.statCard('#f59e0b')}>
                <div style={S.statLabel}>Tax Reserved 🐷</div>
                <div style={{ ...S.statValue, color: '#f59e0b' }}>${stats?.totalTaxReserved?.toFixed(2) ?? '0.00'}</div>
              </div>
              <div style={S.statCard('#a78bfa')}>
                <div style={S.statLabel}>Net Pay</div>
                <div style={{ ...S.statValue, color: '#a78bfa' }}>${stats?.totalNet?.toFixed(2) ?? '0.00'}</div>
              </div>
            </div>

            {/* Tax Reserve Settings Card */}
            <div style={{ ...S.card, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>🐷 Tax Reserve</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>Set aside money each paycheck for year-end taxes</div>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={() => setTaxEnabled(!taxEnabled)}
                  style={{
                    position: 'relative',
                    width: '52px',
                    height: '28px',
                    background: taxEnabled ? '#22c55e' : 'rgba(255,255,255,0.15)',
                    borderRadius: '100px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: taxEnabled ? '27px' : '3px',
                    width: '22px',
                    height: '22px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    display: 'block',
                  }} />
                </button>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ color: taxEnabled ? '#fff' : '#555', transition: 'color 0.2s', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {taxEnabled
                    ? '✅ Active — your tax reserve will be applied to each approved paycheck.'
                    : '💡 Tip: 1099 contractors often owe 25–30% in taxes at year-end. Reserving a small amount each check avoids a surprise bill.'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#999', whiteSpace: 'nowrap' }}>Amount per paycheck:</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', overflow: 'hidden' }}>
                      <span style={{ padding: '0.5rem 0.75rem', color: '#666', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: '0.9rem' }}>$</span>
                      <input
                        type="number"
                        min="1"
                        step="5"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(Number(e.target.value))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '0.5rem 0.75rem',
                          width: '80px',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveTaxSettings}
                    disabled={taxSaving}
                    style={{
                      background: taxSaved ? 'rgba(34,197,94,0.2)' : 'rgba(0,217,255,0.15)',
                      border: `1px solid ${taxSaved ? 'rgba(34,197,94,0.5)' : 'rgba(0,217,255,0.3)'}`,
                      color: taxSaved ? '#22c55e' : '#00d9ff',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      cursor: taxSaving ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {taxSaved ? '✓ Saved!' : taxSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
                {taxEnabled && (
                  <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(247,159,11,0.08)', border: '1px solid rgba(247,159,11,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#f59e0b' }}>
                    💰 <strong>${taxAmount}</strong> will be set aside from each approved paycheck. This money is yours — it just stays earmarked so you have it when tax season comes.
                  </div>
                )}
              </div>
            </div>

            {/* Payroll records */}
            <div style={S.card}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: '700' }}>
                Payroll Records
              </div>
              {payroll?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>No payroll records yet</div>
              ) : (
                <>
                  <div style={{ padding: '0.875rem 1.5rem', background: 'rgba(255,255,255,0.02)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '0' }}>
                    {['Week', 'Hours', 'Gross', 'Tax Reserved', 'Net Pay', 'Status'].map(h => (
                      <div key={h} style={{ fontSize: '0.7rem', color: '#555', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {payroll.map((pr: any) => {
                    const gross = pr.total_amount || 0
                    const taxWithheld = pr.tax_withheld || 0
                    const net = pr.net_amount ?? gross
                    return (
                      <div key={pr.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '0', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.875rem', alignItems: 'center' }}>
                        <div style={{ color: '#999' }}>{pr.week_ending}</div>
                        <div>{pr.total_hours}h</div>
                        <div style={{ color: '#00d9ff' }}>${gross.toFixed(2)}</div>
                        <div style={{ color: taxWithheld > 0 ? '#f59e0b' : '#555' }}>
                          {taxWithheld > 0 ? `🐷 $${taxWithheld.toFixed(2)}` : '—'}
                        </div>
                        <div style={{ fontWeight: '700', color: '#22c55e' }}>${net.toFixed(2)}</div>
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
