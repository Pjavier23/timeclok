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

  // ── Styles ──────────────────────────────────────────
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
    companyName: { fontSize: '0.8rem', color: '#666', marginTop: '2px' },
    content: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      paddingBottom: '0',
    },
    tab: (active: boolean) => ({
      padding: '0.75rem 1.25rem',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #00d9ff' : '2px solid transparent',
      color: active ? '#00d9ff' : '#666',
      fontWeight: active ? '700' : '500',
      fontSize: '0.9rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '-1px',
    }) as React.CSSProperties,
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    statCard: (color: string) => ({
      background: '#1a1a1a',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: '12px',
      padding: '1.5rem',
      borderTop: `3px solid ${color}`,
    }) as React.CSSProperties,
    statLabel: { fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    statValue: { fontSize: '2.5rem', fontWeight: '800' },
    card: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    } as React.CSSProperties,
    cardHeader: {
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: { fontWeight: '700', fontSize: '1rem' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '0.875rem 1.5rem', textAlign: 'left' as const, fontSize: '0.8rem', color: '#666', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' },
    badge: (color: string, bg: string) => ({
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '100px',
      fontSize: '0.75rem',
      fontWeight: '600',
      color,
      background: bg,
    }) as React.CSSProperties,
    btn: (color: string, bg: string) => ({
      padding: '0.4rem 0.875rem',
      background: bg,
      color,
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
    }) as React.CSSProperties,
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
    inviteBtn: {
      background: '#00d9ff',
      color: '#000',
      border: 'none',
      padding: '0.625rem 1.25rem',
      borderRadius: '8px',
      fontWeight: '700',
      cursor: 'pointer',
      fontSize: '0.875rem',
    },
    emptyState: {
      padding: '3rem',
      textAlign: 'center' as const,
      color: '#555',
    },
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff' }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>⏱</div>
          <div style={{ color: '#666' }}>Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const { company, employees, timeEntries, payroll, stats } = data || {}

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      pending: ['#f59e0b', 'rgba(245,158,11,0.1)'],
      approved: ['#22c55e', 'rgba(34,197,94,0.1)'],
      paid: ['#00d9ff', 'rgba(0,217,255,0.1)'],
      rejected: ['#ef4444', 'rgba(239,68,68,0.1)'],
    }
    const [color, bg] = map[status] || ['#999', 'rgba(255,255,255,0.1)']
    return <span style={S.badge(color, bg)}>{status}</span>
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const empName = (entry: any) => entry?.employees?.users?.full_name || entry?.employees?.users?.email || 'Unknown'

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <div style={S.logo}>⏱ TimeClok</div>
          {company && <div style={S.companyName}>{company.name}</div>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '0.8rem', display: 'none' }}>{/* TODO: show user email */}</span>
          <button onClick={handleLogout} style={S.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <div style={S.content}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div style={S.tabs}>
          {(['overview', 'employees', 'timeentries', 'payroll'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={S.tab(activeTab === tab)}>
              {tab === 'overview' && '📊 '}
              {tab === 'employees' && '👥 '}
              {tab === 'timeentries' && '⏰ '}
              {tab === 'payroll' && '💰 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('timeentries', 'Time Entries')}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div>
            <div style={S.grid3}>
              <div style={S.statCard('#00d9ff')}>
                <div style={S.statLabel}>Total Employees</div>
                <div style={{ ...S.statValue, color: '#00d9ff' }}>{stats?.employeeCount ?? 0}</div>
              </div>
              <div style={S.statCard('#22c55e')}>
                <div style={S.statLabel}>Hours This Week</div>
                <div style={{ ...S.statValue, color: '#22c55e' }}>{stats?.weeklyHours ?? 0}</div>
              </div>
              <div style={S.statCard('#f59e0b')}>
                <div style={S.statLabel}>Pending Payroll</div>
                <div style={{ ...S.statValue, color: '#f59e0b' }}>${stats?.pendingPayrollTotal?.toFixed(2) ?? '0.00'}</div>
              </div>
            </div>

            {/* Recent time entries */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Recent Activity</div>
              </div>
              {timeEntries?.length === 0 ? (
                <div style={S.emptyState}>No time entries yet</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee</th>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Clock In</th>
                      <th style={S.th}>Clock Out</th>
                      <th style={S.th}>Hours</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(timeEntries || []).slice(0, 10).map((entry: any) => (
                      <tr key={entry.id}>
                        <td style={S.td}>{empName(entry)}</td>
                        <td style={S.td}>{formatDate(entry.clock_in)}</td>
                        <td style={S.td}>{formatTime(entry.clock_in)}</td>
                        <td style={S.td}>{entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: '#22c55e' }}>● Active</span>}</td>
                        <td style={S.td}>{entry.hours_worked?.toFixed(2) ?? '—'}</td>
                        <td style={S.td}>{statusBadge(entry.approval_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── EMPLOYEES TAB ── */}
        {activeTab === 'employees' && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Team Members ({employees?.length ?? 0})</div>
                <button onClick={copyInviteLink} style={S.inviteBtn}>
                  {copiedLink ? '✓ Copied!' : '+ Add Employee'}
                </button>
              </div>

              {/* Invite link display */}
              {company && (
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,217,255,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#00d9ff', fontWeight: '600', marginBottom: '0.4rem' }}>EMPLOYEE INVITE LINK</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <code style={{ fontSize: '0.8rem', color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {typeof window !== 'undefined' ? generateInviteLink() : `.../${company.id}`}
                    </code>
                    <button onClick={copyInviteLink} style={S.btn('#000', '#00d9ff')}>
                      {copiedLink ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {employees?.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
                  <div>No employees yet.</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Copy the invite link above and share it with your employees.</div>
                </div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Name</th>
                      <th style={S.th}>Email</th>
                      <th style={S.th}>Hourly Rate</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => (
                      <tr key={emp.id}>
                        <td style={S.td}>{emp.users?.full_name || '—'}</td>
                        <td style={S.td}>{emp.users?.email || '—'}</td>
                        <td style={S.td}>${emp.hourly_rate?.toFixed(2) ?? '0.00'}/hr</td>
                        <td style={S.td}>{statusBadge(emp.employee_type || 'w2')}</td>
                        <td style={S.td}>{formatDate(emp.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TIME ENTRIES TAB ── */}
        {activeTab === 'timeentries' && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>All Time Entries ({timeEntries?.length ?? 0})</div>
              </div>
              {timeEntries?.length === 0 ? (
                <div style={S.emptyState}>No time entries recorded yet</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee</th>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Clock In</th>
                      <th style={S.th}>Clock Out</th>
                      <th style={S.th}>Hours</th>
                      <th style={S.th}>Location</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map((entry: any) => (
                      <tr key={entry.id}>
                        <td style={S.td}>{empName(entry)}</td>
                        <td style={S.td}>{formatDate(entry.clock_in)}</td>
                        <td style={S.td}>{formatTime(entry.clock_in)}</td>
                        <td style={S.td}>{entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: '#22c55e' }}>● Active</span>}</td>
                        <td style={{ ...S.td, fontWeight: '600' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</td>
                        <td style={S.td}>
                          {entry.latitude && entry.longitude
                            ? <span style={{ fontSize: '0.75rem', color: '#666' }}>📍 {Number(entry.latitude).toFixed(3)}, {Number(entry.longitude).toFixed(3)}</span>
                            : <span style={{ color: '#444' }}>—</span>}
                        </td>
                        <td style={S.td}>{statusBadge(entry.approval_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── PAYROLL TAB ── */}
        {activeTab === 'payroll' && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Payroll Records ({payroll?.length ?? 0})</div>
              </div>
              {payroll?.length === 0 ? (
                <div style={S.emptyState}>No payroll records yet</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee</th>
                      <th style={S.th}>Week Ending</th>
                      <th style={S.th}>Hours</th>
                      <th style={S.th}>Rate</th>
                      <th style={S.th}>Total</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map((pr: any) => (
                      <tr key={pr.id}>
                        <td style={S.td}>{pr.employees?.users?.full_name || pr.employees?.users?.email || '—'}</td>
                        <td style={S.td}>{pr.week_ending}</td>
                        <td style={S.td}>{pr.total_hours}</td>
                        <td style={S.td}>${pr.hourly_rate?.toFixed(2) ?? '0.00'}</td>
                        <td style={{ ...S.td, fontWeight: '700', color: '#22c55e' }}>${pr.total_amount?.toFixed(2) ?? '0.00'}</td>
                        <td style={S.td}>{statusBadge(pr.status)}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {pr.status === 'pending' && (
                              <button
                                onClick={() => handlePayrollAction(pr.id, 'approved')}
                                disabled={payrollUpdating === pr.id}
                                style={S.btn('#000', '#22c55e')}
                              >
                                Approve
                              </button>
                            )}
                            {pr.status === 'approved' && (
                              <button
                                onClick={() => handlePayrollAction(pr.id, 'paid')}
                                disabled={payrollUpdating === pr.id}
                                style={S.btn('#000', '#00d9ff')}
                              >
                                Mark Paid
                              </button>
                            )}
                            {pr.status === 'paid' && (
                              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✓ Paid {pr.paid_date}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
