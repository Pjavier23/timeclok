'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

type Tab = 'overview' | 'employees' | 'payroll' | 'timeentries'

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [data, setData] = useState<any>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [payrollUpdating, setPayrollUpdating] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success: boolean; emailSent: boolean; inviteUrl: string; message: string } | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    const res = await fetch('/api/owner/data', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const err = await res.json()
      if (res.status === 401) {
        router.push('/auth/login')
        return
      }
      setError(err.error || 'Failed to load data')
      setLoading(false)
      return
    }

    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const generateInviteLink = () => {
    if (!data?.company) return ''
    return `${window.location.origin}/join?company=${data.company.id}`
  }

  const copyInviteLink = async () => {
    const link = generateInviteLink()
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      prompt('Copy this invite link:', link)
    }
  }

  const handlePayrollAction = async (payrollId: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setPayrollUpdating(payrollId)
    const res = await fetch('/api/payroll/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ payrollId, status }),
    })

    if (res.ok) {
      await fetchData()
    }
    setPayrollUpdating(null)
  }

  const handleSendInvite = async () => {
    if (!inviteEmail) return
    setInviteSending(true)
    setInviteResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    })

    const json = await res.json()
    setInviteResult(json)
    setInviteSending(false)

    if (json.success) {
      await fetchData()
    }
  }

  const resetInviteModal = () => {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteName('')
    setInviteResult(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>⏱</div>
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING DASHBOARD</div>
        </div>
      </div>
    )
  }

  const { company, employees, timeEntries, payroll, stats } = data || {}

  // Derive who's clocked in
  const activeSessions = (timeEntries || []).filter((e: any) => !e.clock_out)

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      pending: ['#f59e0b', 'rgba(245,158,11,0.12)'],
      approved: ['#22c55e', 'rgba(34,197,94,0.12)'],
      paid: ['#00d9ff', 'rgba(0,217,255,0.12)'],
      rejected: ['#ef4444', 'rgba(239,68,68,0.12)'],
      w2: ['#a78bfa', 'rgba(167,139,250,0.12)'],
      '1099': ['#f472b6', 'rgba(244,114,182,0.12)'],
    }
    const [color, bg] = map[status] || ['#888', 'rgba(255,255,255,0.08)']
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', color, background: bg, letterSpacing: '0.02em' }}>
        {status}
      </span>
    )
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const empName = (entry: any) => entry?.employees?.users?.full_name || entry?.employees?.users?.email?.split('@')[0] || 'Unknown'
  const empInitial = (entry: any) => (entry?.employees?.users?.full_name || entry?.employees?.users?.email || 'U')[0].toUpperCase()

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview', icon: '▦', label: 'Overview' },
    { id: 'employees', icon: '⬡', label: 'Employees' },
    { id: 'timeentries', icon: '◷', label: 'Time Entries' },
    { id: 'payroll', icon: '◈', label: 'Payroll' },
  ]

  const pendingPayrollCount = (payroll || []).filter((p: any) => p.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' } as React.CSSProperties}>

      {/* ── TOP NAV ── */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⏱</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
          </div>
          {company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1rem' }}>›</span>
              <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: '600' }}>{company.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeSessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.3rem 0.75rem', borderRadius: '100px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block' }} />
              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '700' }}>{activeSessions.length} working now</span>
            </div>
          )}
          {pendingPayrollCount > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', cursor: 'pointer' }} onClick={() => setActiveTab('payroll')}>
              ⚠ {pendingPayrollCount} pending payroll
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#666' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 } as React.CSSProperties}>
        {/* ── SIDEBAR NAV ── */}
        <nav style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0, background: '#0c0c0c' } as React.CSSProperties}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === item.id ? 'rgba(0,217,255,0.08)' : 'transparent',
                color: activeTab === item.id ? '#00d9ff' : '#666',
                fontWeight: activeTab === item.id ? '700' : '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
                borderLeft: activeTab === item.id ? '3px solid #00d9ff' : '3px solid transparent',
              } as React.CSSProperties}
              onMouseEnter={e => { if (activeTab !== item.id) { (e.currentTarget).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget).style.color = '#999' } }}
              onMouseLeave={e => { if (activeTab !== item.id) { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#666' } }}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' } as React.CSSProperties}>{item.icon}</span>
              {item.label}
              {item.id === 'payroll' && pendingPayrollCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: '800', padding: '0.15rem 0.45rem', borderRadius: '100px' }}>
                  {pendingPayrollCount}
                </span>
              )}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Quick invite at bottom */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.12)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grow your team</div>
            <button
              onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
              style={{ width: '100%', padding: '0.5rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              + Invite Employee
            </button>
          </div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', minWidth: 0 } as React.CSSProperties}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Employees', value: stats?.employeeCount ?? 0, icon: '👥', color: '#00d9ff', sub: 'on your team' },
                  { label: 'Working Now', value: activeSessions.length, icon: '🟢', color: '#22c55e', sub: 'clocked in live' },
                  { label: 'Hours This Week', value: `${stats?.weeklyHours ?? 0}h`, icon: '📊', color: '#a78bfa', sub: 'across all staff' },
                  { label: 'Pending Payroll', value: `$${(stats?.pendingPayrollTotal ?? 0).toFixed(0)}`, icon: '💰', color: '#f59e0b', sub: 'awaiting approval' },
                ].map(s => (
                  <div
                    key={s.label}
                    style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem', transition: 'border-color 0.2s, transform 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = `${s.color}33`; (e.currentTarget).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget).style.transform = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{s.icon}</div>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '900', color: s.color, lineHeight: 1, marginBottom: '0.4rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#444' }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Who's working now */}
              {employees && employees.length > 0 && (
                <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', marginBottom: '2rem', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem' }}>Who's Working Now</div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Live employee status</div>
                    </div>
                    <button
                      onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                      style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      + Invite
                    </button>
                  </div>
                  <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {employees.map((emp: any) => {
                      const active = activeSessions.find((e: any) => e.employee_id === emp.id || e.employees?.id === emp.id)
                      const isClockedIn = !!active
                      return (
                        <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: isClockedIn ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.2s' }}>
                          {/* Avatar */}
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${isClockedIn ? '#22c55e' : '#333'}, ${isClockedIn ? '#16a34a' : '#222'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '800', color: isClockedIn ? '#fff' : '#555', flexShrink: 0, position: 'relative' } as React.CSSProperties}>
                            {(emp.users?.full_name || emp.users?.email || 'U')[0].toUpperCase()}
                            <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '12px', height: '12px', borderRadius: '50%', background: isClockedIn ? '#22c55e' : '#444', border: '2px solid #1a1a1a' } as React.CSSProperties} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>
                              {emp.users?.full_name || emp.users?.email?.split('@')[0] || 'Employee'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isClockedIn ? '#22c55e' : '#555', fontWeight: '600' }}>
                              {isClockedIn ? `⏱ ${formatTime(active.clock_in)}` : 'Off'}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#555', flexShrink: 0 }}>
                            ${emp.hourly_rate?.toFixed(0)}/h
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>Recent Activity</div>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Latest time entries</div>
                  </div>
                  <button onClick={() => setActiveTab('timeentries')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', padding: '0.3rem 0.5rem' }}>View all →</button>
                </div>
                {!timeEntries?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏰</div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No time entries yet</div>
                    <div style={{ fontSize: '0.8rem' }}>Invite employees to get started</div>
                  </div>
                ) : (
                  <div>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map(h => (
                        <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                      ))}
                    </div>
                    {(timeEntries || []).slice(0, 8).map((entry: any, i: number) => (
                      <div
                        key={entry.id}
                        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {empInitial(entry)}
                          </div>
                          <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{empName(entry)}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{formatDate(entry.clock_in)}</div>
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{formatTime(entry.clock_in)}</div>
                        <div style={{ fontSize: '0.8rem', color: entry.clock_out ? '#aaa' : '#22c55e', fontWeight: entry.clock_out ? 'normal' : '600' }}>
                          {entry.clock_out ? formatTime(entry.clock_out) : '● Live'}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</div>
                        <div>{statusBadge(entry.approval_status)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EMPLOYEES TAB ── */}
          {activeTab === 'employees' && (
            <div>
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Employees</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{employees?.length ?? 0} team members</p>
                </div>
                <button
                  onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                  style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>+</span> Invite Employee
                </button>
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!employees?.length ? (
                  <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>No employees yet</div>
                    <div style={{ fontSize: '0.875rem', color: '#555', marginBottom: '1.5rem' }}>Invite your first team member to get started</div>
                    <button onClick={() => setShowInviteModal(true)} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem' }}>
                      + Send First Invite
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Employee', 'Email', 'Rate', 'Type', 'Since'].map(h => (
                        <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                      ))}
                    </div>
                    {employees.map((emp: any, i: number) => {
                      const isActive = activeSessions.some((e: any) => e.employee_id === emp.id || e.employees?.id === emp.id)
                      return (
                        <div
                          key={emp.id}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '1rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < employees.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${isActive ? '#22c55e' : '#333'}, ${isActive ? '#16a34a' : '#222'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '800', color: isActive ? '#fff' : '#555', flexShrink: 0, position: 'relative' } as React.CSSProperties}>
                              {(emp.users?.full_name || emp.users?.email || 'U')[0].toUpperCase()}
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#22c55e' : '#555', border: '2px solid #1a1a1a' } as React.CSSProperties} />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{emp.users?.full_name || '—'}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{emp.users?.email || '—'}</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#00d9ff' }}>${emp.hourly_rate?.toFixed(2)}/hr</div>
                          <div>{statusBadge(emp.employee_type || 'w2')}</div>
                          <div style={{ fontSize: '0.8rem', color: '#555' }}>{formatDate(emp.created_at)}</div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Share invite link */}
              <div style={{ marginTop: '1.5rem', background: '#1a1a1a', border: '1px solid rgba(0,217,255,0.12)', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.25rem' }}>🔗 Share Invite Link</div>
                  <div style={{ fontSize: '0.8rem', color: '#555' }}>Anyone with this link can join your team directly.</div>
                </div>
                <button
                  onClick={copyInviteLink}
                  style={{ background: copiedLink ? 'rgba(34,197,94,0.15)' : 'rgba(0,217,255,0.1)', border: `1px solid ${copiedLink ? 'rgba(34,197,94,0.3)' : 'rgba(0,217,255,0.25)'}`, color: copiedLink ? '#22c55e' : '#00d9ff', padding: '0.625rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: 'all 0.2s', whiteSpace: 'nowrap' } as React.CSSProperties}
                >
                  {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
            </div>
          )}

          {/* ── TIME ENTRIES TAB ── */}
          {activeTab === 'timeentries' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Time Entries</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{timeEntries?.length ?? 0} total entries</p>
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!timeEntries?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>No time entries yet</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Employee', 'Date', 'In', 'Out', 'Hours', 'Location', 'Status'].map(h => (
                        <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                      ))}
                    </div>
                    {timeEntries.map((entry: any, i: number) => (
                      <div
                        key={entry.id}
                        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < timeEntries.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {empInitial(entry)}
                          </div>
                          <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{empName(entry)}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{formatDate(entry.clock_in)}</div>
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{formatTime(entry.clock_in)}</div>
                        <div style={{ fontSize: '0.8rem', color: entry.clock_out ? '#aaa' : '#22c55e', fontWeight: entry.clock_out ? 'normal' : '600' }}>
                          {entry.clock_out ? formatTime(entry.clock_out) : '● Live'}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#555' }}>
                          {entry.latitude && entry.longitude
                            ? `📍 ${Number(entry.latitude).toFixed(3)}, ${Number(entry.longitude).toFixed(3)}`
                            : '—'}
                        </div>
                        <div>{statusBadge(entry.approval_status)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── PAYROLL TAB ── */}
          {activeTab === 'payroll' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Payroll</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{payroll?.length ?? 0} records · {pendingPayrollCount} pending approval</p>
              </div>

              {pendingPayrollCount > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f59e0b' }}>{pendingPayrollCount} payroll {pendingPayrollCount === 1 ? 'record' : 'records'} need your approval</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.15rem' }}>Review and approve below to mark employees as paid.</div>
                  </div>
                </div>
              )}

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!payroll?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>No payroll records yet</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Employee', 'Week', 'Hours', 'Gross', 'Tax 🐷', 'Net Pay', 'Status', 'Action'].map(h => (
                        <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                      ))}
                    </div>
                    {payroll.map((pr: any, i: number) => {
                      const gross = pr.total_amount || 0
                      const taxWithheld = pr.tax_withheld || 0
                      const net = pr.net_amount ?? gross
                      return (
                        <div
                          key={pr.id}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < payroll.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{pr.employees?.users?.full_name || pr.employees?.users?.email?.split('@')[0] || '—'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{pr.week_ending}</div>
                          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{pr.total_hours}h</div>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>${gross.toFixed(2)}</div>
                          <div style={{ fontSize: '0.85rem', color: taxWithheld > 0 ? '#f59e0b' : '#444' }}>
                            {taxWithheld > 0 ? `$${taxWithheld.toFixed(2)}` : '—'}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#22c55e' }}>${net.toFixed(2)}</div>
                          <div>{statusBadge(pr.status)}</div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {pr.status === 'pending' && (
                              <button
                                onClick={() => handlePayrollAction(pr.id, 'approved')}
                                disabled={payrollUpdating === pr.id}
                                style={{ padding: '0.375rem 0.75rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}
                                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(34,197,94,0.25)' }}
                                onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(34,197,94,0.15)' }}
                              >
                                ✓ Approve
                              </button>
                            )}
                            {pr.status === 'approved' && (
                              <button
                                onClick={() => handlePayrollAction(pr.id, 'paid')}
                                disabled={payrollUpdating === pr.id}
                                style={{ padding: '0.375rem 0.75rem', background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.3)', color: '#00d9ff', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}
                                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.22)' }}
                                onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.12)' }}
                              >
                                💸 Mark Paid
                              </button>
                            )}
                            {pr.status === 'paid' && (
                              <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>✓ Paid</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' } as React.CSSProperties}
          onClick={(e) => { if (e.target === e.currentTarget) resetInviteModal() }}
        >
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '460px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            {!inviteResult ? (
              <>
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Invite an Employee</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
                    They'll get an email with a magic link to create their account and join your team.
                  </p>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                    placeholder="employee@example.com"
                    autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' } as React.CSSProperties}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Smith"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' } as React.CSSProperties}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleSendInvite}
                    disabled={inviteSending || !inviteEmail}
                    style={{ flex: 1, padding: '0.9rem', background: (!inviteEmail || inviteSending) ? 'rgba(0,217,255,0.3)' : '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: (!inviteEmail || inviteSending) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                  >
                    {inviteSending ? 'Sending...' : '✉️ Send Invite'}
                  </button>
                  <button
                    onClick={resetInviteModal}
                    style={{ padding: '0.9rem 1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget).style.color = '#999' }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#666' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{inviteResult.emailSent ? '✉️' : '🔗'}</div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '900', color: inviteResult.success ? '#22c55e' : '#ef4444' }}>
                    {inviteResult.emailSent ? 'Invite Sent!' : 'Share This Link'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>{inviteResult.message}</p>
                </div>

                {inviteResult.inviteUrl && (
                  <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invite Link</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ fontSize: '0.75rem', color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>
                        {inviteResult.inviteUrl}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.inviteUrl).catch(() => {})
                          setCopiedLink(true)
                          setTimeout(() => setCopiedLink(false), 2000)
                        }}
                        style={{ padding: '0.375rem 0.75rem', background: copiedLink ? 'rgba(34,197,94,0.15)' : 'rgba(0,217,255,0.12)', border: `1px solid ${copiedLink ? 'rgba(34,197,94,0.3)' : 'rgba(0,217,255,0.25)'}`, color: copiedLink ? '#22c55e' : '#00d9ff', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', transition: 'all 0.2s' } as React.CSSProperties}
                      >
                        {copiedLink ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => { setInviteEmail(''); setInviteName(''); setInviteResult(null) }}
                    style={{ flex: 1, padding: '0.875rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Invite Another
                  </button>
                  <button
                    onClick={resetInviteModal}
                    style={{ padding: '0.875rem 1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
