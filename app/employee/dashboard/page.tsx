'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

interface ShiftSummary {
  hours: number
  earned: number
  note: string
  clockOutTime: string
}

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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Feature 2: Clock-out notes & shift summary
  const [clockOutNote, setClockOutNote] = useState('')
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null)

  // Lunch break tracking (localStorage-persisted, no DB migration needed)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null)
  const [breakAccumulated, setBreakAccumulated] = useState(0) // total break seconds so far
  const [breakTick, setBreakTick] = useState(0) // triggers re-render during break

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

  // Restore break state from localStorage when active entry loads
  useEffect(() => {
    if (!data?.activeEntry) {
      // Clocked out — clear break state
      setIsOnBreak(false)
      setBreakStartedAt(null)
      setBreakAccumulated(0)
      localStorage.removeItem('tc_break')
      return
    }
    const saved = localStorage.getItem('tc_break')
    if (saved) {
      try {
        const { entryId, startedAt, accumulated } = JSON.parse(saved)
        if (entryId === data.activeEntry.id) {
          setBreakStartedAt(startedAt)
          setBreakAccumulated(accumulated)
          setIsOnBreak(!!startedAt)
        } else {
          localStorage.removeItem('tc_break')
        }
      } catch { localStorage.removeItem('tc_break') }
    }
  }, [data?.activeEntry?.id])

  // Tick every second while on break (to update break timer display)
  useEffect(() => {
    if (!isOnBreak) return
    const t = setInterval(() => setBreakTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [isOnBreak])

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

  // Feature 1: Today's completed seconds (from finished entries today)
  const todayCompletedSeconds = useMemo(() => {
    const entries: any[] = data?.timeEntries ?? []
    const today = new Date().toDateString()
    return entries
      .filter((e: any) => e.clock_out && new Date(e.clock_in).toDateString() === today)
      .reduce((sum: number, e: any) => sum + ((e.hours_worked ?? 0) * 3600), 0)
  }, [data?.timeEntries])

  // Feature 5: Weekly bar chart base hours (completed entries only, no active session)
  const weeklyDayHoursBase = useMemo(() => {
    const days: number[] = [0, 0, 0, 0, 0, 0, 0] // Mon=0 ... Sun=6
    const entries: any[] = data?.timeEntries ?? []
    const now = new Date()
    const mondayOffset = (now.getDay() + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - mondayOffset)
    monday.setHours(0, 0, 0, 0)
    entries.forEach((e: any) => {
      if (!e.clock_out) return
      const d = new Date(e.clock_in)
      if (d >= monday) {
        const idx = (d.getDay() + 6) % 7
        days[idx] += (e.hours_worked ?? 0)
      }
    })
    return days
  }, [data?.timeEntries])

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
    setShiftSummary(null)

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
      setTimeout(() => setClockSuccess(null), 4000)
      await fetchData()
    }
    setClockLoading(false)
  }

  const handleClockOut = async () => {
    setClockLoading(true)
    setError('')

    const session = await getSession()
    if (!session) return

    // Auto-end break if still on break when clocking out
    let finalBreakSecs = breakAccumulated
    if (isOnBreak && breakStartedAt) {
      finalBreakSecs += Math.floor((Date.now() - breakStartedAt) / 1000)
      setIsOnBreak(false)
      setBreakStartedAt(null)
    }
    const breakMinutes = Math.round(finalBreakSecs / 60)
    localStorage.removeItem('tc_break')

    const res = await fetch('/api/employee/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'clock_out', entryId: data?.activeEntry?.id, notes: clockOutNote, breakMinutes }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      // Build shift summary from returned entry
      const hoursWorked = json.entry?.hours_worked ?? 0
      const rate = data?.stats?.hourlyRate ?? 0
      setShiftSummary({
        hours: hoursWorked,
        earned: hoursWorked * rate,
        note: clockOutNote,
        clockOutTime: json.entry?.clock_out ?? new Date().toISOString(),
      })
      setClockOutNote('')
      setClockSuccess('out')
      setTimeout(() => setClockSuccess(null), 4000)
      await fetchData()
    }
    setClockLoading(false)
  }

  const handleStartBreak = () => {
    const now = Date.now()
    setIsOnBreak(true)
    setBreakStartedAt(now)
    const saved = { entryId: data?.activeEntry?.id, startedAt: now, accumulated: breakAccumulated }
    localStorage.setItem('tc_break', JSON.stringify(saved))
  }

  const handleEndBreak = () => {
    const breakSecs = breakStartedAt ? Math.floor((Date.now() - breakStartedAt) / 1000) : 0
    const newAccumulated = breakAccumulated + breakSecs
    setIsOnBreak(false)
    setBreakStartedAt(null)
    setBreakAccumulated(newAccumulated)
    const saved = { entryId: data?.activeEntry?.id, startedAt: null, accumulated: newAccumulated }
    localStorage.setItem('tc_break', JSON.stringify(saved))
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

  const { user, company, employee, timeEntries, payroll, activeEntry, stats } = data || {}
  const isClockedIn = !!activeEntry

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  // Feature 1: Live earnings ticker calculations
  const hourlyRate = stats?.hourlyRate ?? 0

  // Break-aware elapsed: deduct accumulated break time from worked seconds
  const currentBreakSecs = isOnBreak && breakStartedAt ? Math.floor((Date.now() - breakStartedAt) / 1000) : 0
  const totalBreakSecs = breakAccumulated + currentBreakSecs
  const workedElapsed = Math.max(0, elapsed - totalBreakSecs)

  const todayEarningsLive = ((todayCompletedSeconds + workedElapsed) / 3600 * hourlyRate).toFixed(2)
  const weeklyHoursCompleted = stats?.weeklyHours ?? 0
  const weeklyEarningsLive = ((weeklyHoursCompleted + workedElapsed / 3600) * hourlyRate).toFixed(2)

  // Feature 5: Weekly chart with live session injected into today's bar
  const todayDayIdx = (new Date().getDay() + 6) % 7
  const weeklyDayHours = weeklyDayHoursBase.map((h, i) =>
    i === todayDayIdx && isClockedIn ? h + elapsed / 3600 : h
  )
  const maxDayHours = Math.max(...weeklyDayHours, 1)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#0c0c0c', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, width: '100%', boxSizing: 'border-box' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, minWidth: 0 }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⏱</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0 } as React.CSSProperties}>TimeClok</span>
          {company?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', flexShrink: 0 }}>›</span>
              <span style={{ fontSize: '0.75rem', color: '#00d9ff', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '90px' : '160px', background: 'rgba(0,217,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,217,255,0.2)' } as React.CSSProperties}>
                {company.name}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          {isClockedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.25rem 0.6rem', borderRadius: '100px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: isOnBreak ? '#fbbf24' : '#22c55e', fontWeight: '700', fontFamily: 'monospace' }}>{isOnBreak ? '☕' : formatElapsed(workedElapsed)}</span>
            </div>
          )}
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          {!isMobile && (
            <span style={{ fontSize: '0.8rem', color: '#555', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{user?.email}</span>
          )}
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#555', padding: '0.35rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', flexShrink: 0, width: isMobile ? '30px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#555' }}
            title="Sign Out"
          >
            {isMobile ? '↩' : 'Sign Out'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: isMobile ? '1.25rem 1rem' : '2rem 1.5rem', paddingBottom: isMobile ? 'calc(1.5rem + env(safe-area-inset-bottom, 16px))' : '2rem', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}>

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

        {/* Clock-in success banner */}
        {clockSuccess === 'in' && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', color: '#22c55e', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
            <div>
              <div>Clocked in at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — timer is running!</div>
              <div style={{ fontSize: '0.78rem', color: '#22c55e88', marginTop: '0.2rem', fontWeight: '500' }}>GPS location captured · Shift has started</div>
            </div>
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
              {!isMobile && <span>{tab.label}</span>}
              {isMobile && <span style={{ fontSize: '0.7rem' }}>{tab.label.split(' ')[0]}</span>}
            </button>
          ))}
        </div>

        {/* ── CLOCK TAB ── */}
        {activeTab === 'clock' && (
          <div>
            {/* ── SHIFT SUMMARY (after clock-out) ── */}
            {shiftSummary && !isClockedIn && (
              <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(0,217,255,0.05))', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #22c55e, #00d9ff)' } as React.CSSProperties} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Shift Complete</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff' }}>Great work! 🎉</div>
                  </div>
                  <button onClick={() => setShiftSummary(null)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: shiftSummary.note ? '1rem' : '0' }}>
                  <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#22c55e88', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Hours Worked</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#22c55e' }}>{shiftSummary.hours.toFixed(2)}h</div>
                  </div>
                  <div style={{ background: 'rgba(0,217,255,0.08)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(0,217,255,0.15)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#00d9ff88', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Shift Earnings</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#00d9ff' }}>${shiftSummary.earned.toFixed(2)}</div>
                  </div>
                </div>
                {shiftSummary.note && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', marginBottom: '0.35rem' }}>SHIFT NOTE</div>
                    <div style={{ fontSize: '0.875rem', color: '#aaa', fontStyle: 'italic' }}>"{shiftSummary.note}"</div>
                  </div>
                )}
              </div>
            )}

            {/* Main clock card */}
            <div style={{
              background: '#1a1a1a',
              borderRadius: '20px',
              padding: isMobile ? '1.75rem 1.25rem' : '2.5rem 2rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
              position: 'relative',
              overflow: 'hidden',
            } as React.CSSProperties}>
              {/* Ambient glow */}
              {isClockedIn && (
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(34,197,94,0.06) 0%, transparent 60%)', pointerEvents: 'none' } as React.CSSProperties} />
              )}

              <div style={{ position: 'relative', zIndex: 1 } as React.CSSProperties}>
                {/* Status pill */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    borderRadius: '100px',
                    background: isOnBreak ? 'rgba(251,191,36,0.12)' : isClockedIn ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOnBreak ? 'rgba(251,191,36,0.3)' : isClockedIn ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnBreak ? '#fbbf24' : isClockedIn ? '#22c55e' : '#555', display: 'block', animation: isOnBreak ? 'pulse 1.5s infinite' : 'none' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isOnBreak ? '#fbbf24' : isClockedIn ? '#22c55e' : '#666', letterSpacing: '0.04em' }}>
                      {isOnBreak ? '☕ ON BREAK' : isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                    </span>
                  </div>
                </div>

                {isClockedIn ? (
                  <div>
                    {/* Live timer — shows worked time only (break time excluded) */}
                    <div style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 'clamp(2.75rem, 10vw, 4.5rem)', fontWeight: '900', color: isOnBreak ? '#fbbf24' : '#22c55e', letterSpacing: '0.02em', lineHeight: 1, marginBottom: '0.25rem', transition: 'color 0.3s' }}>
                      {formatElapsed(workedElapsed)}
                    </div>
                    {isOnBreak && (
                      <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '700', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                        Break: {formatElapsed(currentBreakSecs)}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1.25rem' }}>
                      Clocked in at {formatTime(activeEntry.clock_in)}{totalBreakSecs > 60 ? ` · ${Math.round(totalBreakSecs / 60)}m break` : ''}
                    </div>

                    {/* Feature 1: Live Earnings Ticker */}
                    {hourlyRate > 0 && (
                      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.15)', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#00d9ff66', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                          💰 Earned Today
                        </div>
                        <div style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '2.25rem', fontWeight: '900', color: '#00d9ff', lineHeight: 1, marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                          ${todayEarningsLive}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#00d9ff55', fontWeight: '500' }}>
                          This week: ${weeklyEarningsLive} · ${hourlyRate.toFixed(2)}/hr
                        </div>
                      </div>
                    )}

                    {(activeEntry.location_name || activeEntry.latitude) && (
                      <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                        <span>📍</span>
                        <span>{activeEntry.location_name || `${Number(activeEntry.latitude).toFixed(4)}, ${Number(activeEntry.longitude).toFixed(4)}`}</span>
                      </div>
                    )}

                    {/* Feature 2: Clock-Out Note textarea */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                        Shift Note (optional)
                      </label>
                      <textarea
                        value={clockOutNote}
                        onChange={e => setClockOutNote(e.target.value)}
                        placeholder="What did you work on? Any notes for your manager..."
                        rows={2}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          color: '#ccc',
                          fontSize: '0.875rem',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          transition: 'border-color 0.2s',
                        } as React.CSSProperties}
                        onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                      Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
                    </div>
                    {user?.full_name && (
                      <div style={{ fontSize: '1rem', color: '#ccc', fontWeight: '600', marginBottom: '0.4rem' }}>
                        {user.full_name}
                      </div>
                    )}
                    {company?.name && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,217,255,0.07)', border: '1px solid rgba(0,217,255,0.18)', borderRadius: '8px', padding: '0.3rem 0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>🏢</span>
                        <span style={{ fontSize: '0.8rem', color: '#00d9ff', fontWeight: '700' }}>{company.name}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.5rem' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    {hourlyRate > 0 && (
                      <div style={{ fontSize: '0.875rem', color: '#444' }}>
                        Today so far: <span style={{ color: '#00d9ff', fontWeight: '700' }}>${(todayCompletedSeconds / 3600 * hourlyRate).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Big clock button */}
                <button
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  disabled={clockLoading}
                  style={{
                    width: '170px',
                    height: '170px',
                    borderRadius: '50%',
                    border: `3px solid ${isClockedIn ? '#ef4444' : '#22c55e'}`,
                    background: isClockedIn
                      ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)'
                      : 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
                    color: isClockedIn ? '#ef4444' : '#22c55e',
                    fontSize: '1rem',
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
                  <span style={{ fontSize: '1.75rem' }}>{clockLoading ? '⏳' : isClockedIn ? '⏹' : '▶'}</span>
                  <span>{clockLoading ? '...' : isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}</span>
                </button>

                {/* Break button — only shows when clocked in */}
                {isClockedIn && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <button
                      onClick={isOnBreak ? handleEndBreak : handleStartBreak}
                      disabled={clockLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 1.5rem',
                        borderRadius: '100px',
                        border: `1.5px solid ${isOnBreak ? 'rgba(34,197,94,0.5)' : 'rgba(251,191,36,0.4)'}`,
                        background: isOnBreak ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.08)',
                        color: isOnBreak ? '#22c55e' : '#fbbf24',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        cursor: clockLoading ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.03em',
                        transition: 'all 0.2s',
                      } as React.CSSProperties}
                    >
                      <span>{isOnBreak ? '▶' : '☕'}</span>
                      <span>{isOnBreak ? 'END BREAK' : 'START BREAK'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'This Week', value: `${(weeklyHoursCompleted + (isClockedIn ? elapsed / 3600 : 0)).toFixed(1)}h`, color: '#00d9ff', icon: '📊' },
                { label: 'Hourly Rate', value: `$${hourlyRate.toFixed(2)}`, color: '#22c55e', icon: '💰' },
                { label: 'Total Earned', value: `$${(stats?.totalGross ?? 0).toFixed(0)}`, color: '#f59e0b', icon: '🏦' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color, lineHeight: 1, marginBottom: '0.25rem' }}>{s.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature 5: Weekly Hours Bar Chart */}
            <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '800' }}>This Week's Hours</div>
                  <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '0.2rem' }}>
                    Mon – Sun · {weeklyDayHours.reduce((a, b) => a + b, 0).toFixed(1)}h total
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', textAlign: 'right' }}>
                  <span style={{ color: '#00d9ff', fontWeight: '700' }}>■</span> today
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '80px' }}>
                {weeklyDayHours.map((h, i) => {
                  const isToday = i === todayDayIdx
                  const pct = maxDayHours > 0 ? (h / maxDayHours) : 0
                  const barH = Math.max(pct * 64, h > 0 ? 4 : 0)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.65rem', color: isToday ? '#00d9ff' : '#999', fontWeight: '700', minHeight: '16px', textAlign: 'center', lineHeight: 1 }}>
                        {h > 0 ? `${h.toFixed(1)}` : ''}
                      </div>
                      <div style={{ width: '100%', height: '64px', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${barH}px`,
                          background: isToday
                            ? 'linear-gradient(180deg, #00d9ff, #0099cc)'
                            : h > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                          borderRadius: '4px 4px 2px 2px',
                          transition: 'height 0.5s ease',
                          boxShadow: isToday && h > 0 ? '0 0 12px rgba(0,217,255,0.3)' : 'none',
                        } as React.CSSProperties} />
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: isToday ? '800' : '500', color: isToday ? '#00d9ff' : '#888' }}>
                        {dayLabels[i]}
                      </div>
                    </div>
                  )
                })}
              </div>
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
                      style={{ background: '#1a1a1a', border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '1rem 1.25rem' }}
                    >
                      {/* Top row: date + hours + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{formatDate(entry.clock_in)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '900', color: isActive ? '#22c55e' : '#fff' }}>
                            {isActive ? formatElapsed(elapsed) : `${entry.hours_worked?.toFixed(2) ?? '—'}h`}
                          </div>
                          {statusBadge(entry.approval_status)}
                        </div>
                      </div>
                      {/* Bottom row: in/out times */}
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#666' }}>
                        <div>
                          <span style={{ color: '#444', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.4rem' }}>IN</span>
                          <span style={{ color: '#aaa' }}>{formatTime(entry.clock_in)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#444', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.4rem' }}>OUT</span>
                          <span style={{ color: isActive ? '#22c55e' : '#aaa', fontWeight: isActive ? '700' : 'normal' }}>
                            {isActive ? '● Active' : formatTime(entry.clock_out)}
                          </span>
                        </div>
                      </div>
                      {entry.notes && (
                        <div style={{ marginTop: '0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#666', borderLeft: '2px solid rgba(255,255,255,0.1)', fontStyle: 'italic' }}>
                          "{entry.notes}"
                        </div>
                      )}
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
                    <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
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
                <div style={{ padding: '0.75rem' }}>
                  {payroll.map((pr: any, i: number) => {
                    const gross = pr.total_amount || 0
                    const taxWithheld = pr.tax_withheld || 0
                    const net = pr.net_amount ?? gross
                    return (
                      <div
                        key={pr.id}
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', marginBottom: i < payroll.length - 1 ? '0.5rem' : '0' }}
                      >
                        {/* Row 1: week + status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#aaa' }}>Week of {pr.week_ending}</div>
                          {statusBadge(pr.status)}
                        </div>
                        {/* Row 2: stats grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.62rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Hours</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#aaa' }}>{pr.total_hours}h</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.62rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Gross</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#aaa' }}>${gross.toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.62rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Net Pay</div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#22c55e' }}>${net.toFixed(2)}</div>
                          </div>
                        </div>
                        {taxWithheld > 0 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#f59e0b' }}>🐷 ${taxWithheld.toFixed(2)} tax reserved</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
