'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

type Tab = 'overview' | 'employees' | 'payroll' | 'timeentries' | 'billing' | 'settings'

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [data, setData] = useState<any>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [payrollUpdating, setPayrollUpdating] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Feature 3: Bulk approve state
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkApproveMsg, setBulkApproveMsg] = useState<string | null>(null)

  // Settings state
  const [settingsPaySchedule, setSettingsPaySchedule] = useState('weekly')
  const [settingsCompanyName, setSettingsCompanyName] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsMigrationNeeded, setSettingsMigrationNeeded] = useState(false)

  // Invite modal state
  // Inline rate editing
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [editingRateValue, setEditingRateValue] = useState('')
  const [rateSaving, setRateSaving] = useState(false)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success: boolean; emailSent?: boolean; smsSent?: boolean; inviteUrl: string; message: string } | null>(null)

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
    if (json.company) {
      setSettingsCompanyName(json.company.name || '')
      setSettingsPaySchedule(json.company.pay_schedule || 'weekly')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRateUpdate = async (empId: string) => {
    const rate = parseFloat(editingRateValue)
    if (isNaN(rate) || rate < 0) { setEditingRateId(null); return }
    setRateSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/owner/employees/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ hourly_rate: rate }),
      })
      await fetchData()
    } catch (e) { /* silent */ }
    setRateSaving(false)
    setEditingRateId(null)
  }

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

  // Feature 3: Bulk Approve
  const handleBulkApprove = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setBulkApproving(true)
    setBulkApproveMsg(null)

    const res = await fetch('/api/payroll/bulk-approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    const json = await res.json()
    setBulkApproving(false)

    if (json.success) {
      setBulkApproveMsg(`✓ ${json.message}`)
      setTimeout(() => setBulkApproveMsg(null), 5000)
      await fetchData()
    } else {
      setBulkApproveMsg(`⚠ ${json.error}`)
    }
  }

  // Feature 4: CSV Export helpers
  const exportCSV = (rows: string[][], filename: string) => {
    const csvContent = rows.map(row =>
      row.map(cell => {
        const str = String(cell ?? '')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportTimeEntriesCSV = () => {
    if (!data?.timeEntries?.length) return
    const headers = ['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status', 'Notes']
    const rows = data.timeEntries.map((e: any) => [
      empName(e),
      new Date(e.clock_in).toLocaleDateString(),
      new Date(e.clock_in).toLocaleTimeString(),
      e.clock_out ? new Date(e.clock_out).toLocaleTimeString() : '',
      e.hours_worked?.toFixed(2) ?? '',
      e.location_name || (e.latitude && e.longitude ? `${Number(e.latitude).toFixed(4)},${Number(e.longitude).toFixed(4)}` : ''),
      e.approval_status ?? '',
      e.notes ?? '',
    ])
    exportCSV([headers, ...rows], `time-entries-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const exportPayrollCSV = () => {
    if (!data?.payroll?.length) return
    const headers = ['Employee', 'Week Ending', 'Hours', 'Gross', 'Tax Withheld', 'Net Pay', 'Status']
    const rows = data.payroll.map((pr: any) => {
      const gross = pr.total_amount || 0
      const tax = pr.tax_withheld || 0
      const net = pr.net_amount ?? gross
      return [
        pr.employees?.users?.full_name || pr.employees?.users?.email?.split('@')[0] || '',
        pr.week_ending ?? '',
        pr.total_hours ?? '',
        gross.toFixed(2),
        tax.toFixed(2),
        net.toFixed(2),
        pr.status ?? '',
      ]
    })
    exportCSV([headers, ...rows], `payroll-${new Date().toISOString().slice(0, 10)}.csv`)
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
      body: JSON.stringify({
        method: inviteMethod,
        email: inviteMethod === 'email' ? inviteEmail : undefined,
        phone: inviteMethod === 'sms' ? invitePhone : undefined,
        name: inviteName,
      }),
    })

    const json = await res.json()
    setInviteResult(json)
    setInviteSending(false)

    if (json.success) {
      await fetchData()
    }
  }

  const handleSaveSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSettingsSaving(true)
    setSettingsSaved(false)
    const res = await fetch('/api/owner/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name: settingsCompanyName, pay_schedule: settingsPaySchedule }),
    })
    const json = await res.json()
    setSettingsSaving(false)
    if (json.migration_needed) setSettingsMigrationNeeded(true)
    if (json.success) { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); await fetchData() }
  }

  const resetInviteModal = () => {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteName('')
    setInvitePhone('')
    setInviteMethod('email')
    setInviteResult(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏱</div>
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING DASHBOARD</div>
        </div>
      </div>
    )
  }

  const { company, employees, timeEntries, payroll, stats } = data || {}

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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', color, background: bg }}>
        {status}
      </span>
    )
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const empName = (entry: any) => entry?.employees?.users?.full_name || entry?.employees?.users?.email?.split('@')[0] || 'Unknown'
  const empInitial = (entry: any) => (entry?.employees?.users?.full_name || entry?.employees?.users?.email || 'U')[0].toUpperCase()

  // Feature 6: Relative time helper
  const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  // Feature 6: Build activity feed from time entries + payroll
  const buildActivityFeed = () => {
    const items: { type: 'clock_in' | 'clock_out' | 'payroll'; name: string; detail: string; time: string; ts: number }[] = []

    // Recent clock events (last 20 entries)
    const recentEntries = [...(timeEntries || [])].sort((a: any, b: any) =>
      new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
    ).slice(0, 20)

    recentEntries.forEach((e: any) => {
      const name = empName(e)
      items.push({
        type: 'clock_in',
        name,
        detail: `clocked in`,
        time: relativeTime(e.clock_in),
        ts: new Date(e.clock_in).getTime(),
      })
      if (e.clock_out) {
        const hours = e.hours_worked?.toFixed(1) ?? '?'
        items.push({
          type: 'clock_out',
          name,
          detail: `clocked out · ${hours}h worked`,
          time: relativeTime(e.clock_out),
          ts: new Date(e.clock_out).getTime(),
        })
      }
    })

    // Recent payroll approvals
    const approvedPayroll = (payroll || []).filter((p: any) => p.status === 'approved' || p.status === 'paid')
    approvedPayroll.forEach((p: any) => {
      const name = p.employees?.users?.full_name || p.employees?.users?.email?.split('@')[0] || 'Employee'
      const net = (p.net_amount ?? p.total_amount ?? 0).toFixed(2)
      items.push({
        type: 'payroll',
        name,
        detail: `payroll approved · $${net}`,
        time: p.week_ending ? `week of ${p.week_ending}` : 'recent',
        ts: 0, // payroll items don't have a timestamp easily, put at end
      })
    })

    // Sort by time desc, payroll items go after live events
    items.sort((a, b) => b.ts - a.ts)
    return items.slice(0, 12)
  }

  const activityFeed = buildActivityFeed()

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview', icon: '▦', label: 'Overview' },
    { id: 'employees', icon: '⬡', label: 'Employees' },
    { id: 'timeentries', icon: '◷', label: 'Time Entries' },
    { id: 'payroll', icon: '◈', label: 'Payroll' },
    { id: 'billing', icon: '💳', label: 'Billing' },
  ]

  const pendingPayrollCount = (payroll || []).filter((p: any) => p.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', overflowX: 'hidden' } as React.CSSProperties}>

      {/* ── TOP NAV ── */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxSizing: 'border-box', width: '100%' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⏱</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0 } as React.CSSProperties}>TimeClok</span>
          {company && !isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1rem' }}>›</span>
              <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' } as React.CSSProperties}>{company.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {activeSessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.25rem 0.6rem', borderRadius: '100px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>{activeSessions.length} {isMobile ? '' : 'working now'}</span>
            </div>
          )}
          {pendingPayrollCount > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.25rem 0.6rem', borderRadius: '100px', fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }} onClick={() => setActiveTab('payroll')}>
              ⚠ {pendingPayrollCount}
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', flexShrink: 0 } as React.CSSProperties}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#666' }}
          >
            {isMobile ? '↩' : 'Sign Out'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minWidth: 0 } as React.CSSProperties}>
        {/* ── SIDEBAR (desktop only) ── */}
        {!isMobile && (
          <nav style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0, background: '#0c0c0c' } as React.CSSProperties}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => item.id === 'billing' ? router.push('/owner/billing') : setActiveTab(item.id)}
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
        )}

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: isMobile ? '1.25rem 1rem 5rem' : '2rem', overflowY: 'auto', minWidth: 0, width: '100%', boxSizing: 'border-box' } as React.CSSProperties}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              {/* Upgrade nudge */}
              {company?.subscription_status !== 'active' && (
                <div
                  onClick={() => router.push('/owner/billing')}
                  style={{ background: 'rgba(0,217,255,0.04)', border: '1px solid rgba(0,217,255,0.15)', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.04)' }}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚡</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: '#666' }}>
                    <span style={{ color: '#00d9ff', fontWeight: '700' }}>Upgrade to Pro</span> — unlock payroll processing for $99/mo
                  </span>
                  <span style={{ color: '#00d9ff', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>→</span>
                </div>
              )}
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stat cards — all clickable */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Employees', value: stats?.employeeCount ?? 0, icon: '👥', color: '#00d9ff', sub: 'Tap to view all', tab: 'employees' as Tab },
                  { label: 'Working Now', value: activeSessions.length, icon: '🟢', color: '#22c55e', sub: 'Tap to see who', tab: 'timeentries' as Tab },
                  { label: 'Hours This Week', value: `${stats?.weeklyHours ?? 0}h`, icon: '📊', color: '#a78bfa', sub: 'Tap to view entries', tab: 'timeentries' as Tab },
                  { label: 'Pending Payroll', value: `$${(stats?.pendingPayrollTotal ?? 0).toFixed(0)}`, icon: '💰', color: '#f59e0b', sub: 'Tap to approve', tab: 'payroll' as Tab },
                ].map(s => (
                  <div
                    key={s.label}
                    onClick={() => setActiveTab(s.tab)}
                    style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = `${s.color}55`; (e.currentTarget).style.transform = 'translateY(-2px)'; (e.currentTarget).style.background = '#202020' }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget).style.transform = 'none'; (e.currentTarget).style.background = '#1a1a1a' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{s.icon}</div>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '900', color: s.color, lineHeight: 1, marginBottom: '0.4rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: s.color, opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {s.sub} <span style={{ fontSize: '0.65rem' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Who's working now */}
              {employees && employees.length > 0 && (
                <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', marginBottom: '2rem', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem' }}>Live Attendance</div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>{activeSessions.length} of {employees.length} clocked in right now</div>
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
                        <div
                          key={emp.id}
                          onClick={() => router.push(`/owner/employees/${emp.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: isClockedIn ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${isClockedIn ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.transform = 'translateY(-1px)'; (e.currentTarget).style.borderColor = isClockedIn ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.12)' }}
                          onMouseLeave={e => { (e.currentTarget).style.transform = 'none'; (e.currentTarget).style.borderColor = isClockedIn ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)' }}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${isClockedIn ? '#22c55e' : '#333'}, ${isClockedIn ? '#16a34a' : '#222'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '800', color: isClockedIn ? '#fff' : '#555', flexShrink: 0, position: 'relative' } as React.CSSProperties}>
                            {(emp.users?.full_name || emp.users?.email || 'U')[0].toUpperCase()}
                            <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '12px', height: '12px', borderRadius: '50%', background: isClockedIn ? '#22c55e' : '#444', border: '2px solid #1a1a1a' } as React.CSSProperties} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>
                              {emp.users?.full_name || emp.users?.email?.split('@')[0] || 'Employee'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isClockedIn ? '#22c55e' : '#555', fontWeight: '600' }}>
                              {isClockedIn ? `⏱ Since ${formatTime(active.clock_in)}` : 'Off clock'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.75rem', color: '#555' }}>${emp.hourly_rate?.toFixed(0)}/h</div>
                            <div style={{ fontSize: '0.65rem', color: '#333' }}>View →</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Feature 6: Rich Activity Feed */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>Recent Activity</div>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Live stream of clock-ins, clock-outs & payroll</div>
                  </div>
                  <button onClick={() => setActiveTab('timeentries')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', padding: '0.3rem 0.5rem' }}>View all →</button>
                </div>

                {activityFeed.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏰</div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No activity yet</div>
                    <div style={{ fontSize: '0.8rem' }}>Invite employees to get started</div>
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    {activityFeed.map((item, i) => {
                      const config = {
                        clock_in: { dot: '#22c55e', icon: '🟢', label: 'clocked in', dotColor: 'rgba(34,197,94,0.15)' },
                        clock_out: { dot: '#ef4444', icon: '🔴', label: 'clocked out', dotColor: 'rgba(239,68,68,0.15)' },
                        payroll: { dot: '#f59e0b', icon: '💰', label: 'payroll', dotColor: 'rgba(245,158,11,0.15)' },
                      }[item.type]

                      return (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: i < activityFeed.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          {/* Dot indicator */}
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: config.dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>
                            {config.icon}
                          </div>
                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: '700', color: '#fff' }}>{item.name}</span>
                              <span style={{ color: '#555', marginLeft: '0.35rem' }}>{item.detail}</span>
                            </div>
                          </div>
                          {/* Timestamp */}
                          <div style={{ fontSize: '0.75rem', color: '#444', flexShrink: 0, whiteSpace: 'nowrap' } as React.CSSProperties}>
                            {item.time}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EMPLOYEES TAB ── */}
          {activeTab === 'employees' && (
            <div>
              {/* Upgrade nudge banner */}
              {company?.subscription_status !== 'active' && (
                <div
                  onClick={() => router.push('/owner/billing')}
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(245,158,11,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(245,158,11,0.07)' }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#f59e0b' }}>Upgrade to Pro</span>
                    <span style={{ color: '#888', fontSize: '0.875rem' }}> to unlock payroll processing and unlimited features — $99/mo</span>
                  </div>
                  <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>→</span>
                </div>
              )}
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
                    {!isMobile && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 0.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Employee', 'Email', 'Rate', 'Type', 'Since', ''].map(h => (
                          <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {employees.map((emp: any, i: number) => {
                      const isActive = activeSessions.some((e: any) => e.employee_id === emp.id || e.employees?.id === emp.id)
                      return isMobile ? (
                        /* Mobile: card layout — clickable */
                        <div
                          key={emp.id}
                          onClick={() => router.push(`/owner/employees/${emp.id}`)}
                          style={{ padding: '1rem', borderBottom: i < employees.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${isActive ? '#22c55e' : '#333'}, ${isActive ? '#16a34a' : '#222'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: isActive ? '#fff' : '#555', flexShrink: 0, position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
                              {emp.avatar_url
                                ? <img src={emp.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : (emp.users?.full_name || emp.users?.email || 'U')[0].toUpperCase()}
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#22c55e' : '#555', border: '2px solid #1a1a1a' } as React.CSSProperties} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{emp.users?.full_name || '—'}</span>
                                {emp.position && <span style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.1rem 0.45rem', borderRadius: '100px', fontSize: '0.65rem', fontWeight: '700' }}>{emp.position}</span>}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{emp.users?.email || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 } as React.CSSProperties}>
                              {editingRateId === emp.id ? (
                                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#00d9ff' }}>$</span>
                                  <input
                                    autoFocus
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={editingRateValue}
                                    onChange={e => setEditingRateValue(e.target.value)}
                                    onBlur={() => handleRateUpdate(emp.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRateUpdate(emp.id); if (e.key === 'Escape') setEditingRateId(null) }}
                                    style={{ width: '56px', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.4)', borderRadius: '6px', color: '#00d9ff', padding: '0.2rem 0.4rem', fontSize: '0.85rem', fontWeight: '800', outline: 'none', textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: '0.75rem', color: '#00d9ff' }}>/hr</span>
                                </div>
                              ) : (
                                <div
                                  onClick={e => { e.stopPropagation(); setEditingRateId(emp.id); setEditingRateValue(emp.hourly_rate?.toString() || '0') }}
                                  style={{ fontSize: '0.9rem', fontWeight: '800', color: '#00d9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                                  onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(0,217,255,0.3)' }}
                                  onMouseLeave={e => { (e.currentTarget).style.borderColor = 'transparent' }}
                                  title="Tap to edit rate"
                                >
                                  ${emp.hourly_rate?.toFixed(0)}/hr <span style={{ fontSize: '0.65rem', color: '#555' }}>✎</span>
                                </div>
                              )}
                              <div style={{ fontSize: '0.7rem', color: '#555' }}>›</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {statusBadge(emp.employee_type || 'w2')}
                            <span style={{ fontSize: '0.72rem', color: '#444' }}>Joined {formatDate(emp.created_at)}</span>
                            {isActive && <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>● Working now</span>}
                          </div>
                        </div>
                      ) : (
                        /* Desktop: table row — clickable */
                        <div
                          key={emp.id}
                          onClick={() => router.push(`/owner/employees/${emp.id}`)}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 0.5fr', padding: '1rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < employees.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${isActive ? '#22c55e' : '#333'}, ${isActive ? '#16a34a' : '#222'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '800', color: isActive ? '#fff' : '#555', flexShrink: 0, position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
                              {emp.avatar_url
                                ? <img src={emp.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : (emp.users?.full_name || emp.users?.email || 'U')[0].toUpperCase()}
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#22c55e' : '#555', border: '2px solid #1a1a1a' } as React.CSSProperties} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{emp.users?.full_name || '—'}</div>
                              {emp.position && <div style={{ fontSize: '0.72rem', color: '#00d9ff', marginTop: '0.1rem' }}>{emp.position}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{emp.users?.email || '—'}</div>
                          <div onClick={e => e.stopPropagation()}>
                            {editingRateId === emp.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#00d9ff' }}>$</span>
                                <input
                                  autoFocus
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={editingRateValue}
                                  onChange={e => setEditingRateValue(e.target.value)}
                                  onBlur={() => handleRateUpdate(emp.id)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleRateUpdate(emp.id); if (e.key === 'Escape') setEditingRateId(null) }}
                                  style={{ width: '60px', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.4)', borderRadius: '6px', color: '#00d9ff', padding: '0.25rem 0.4rem', fontSize: '0.875rem', fontWeight: '700', outline: 'none', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '0.78rem', color: '#00d9ff' }}>/hr</span>
                              </div>
                            ) : (
                              <div
                                onClick={() => { setEditingRateId(emp.id); setEditingRateValue(emp.hourly_rate?.toString() || '0') }}
                                style={{ fontSize: '0.875rem', fontWeight: '700', color: '#00d9ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.45rem', borderRadius: '6px', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(0,217,255,0.3)' }}
                                onMouseLeave={e => { (e.currentTarget).style.borderColor = 'transparent' }}
                                title="Click to edit rate"
                              >
                                ${emp.hourly_rate?.toFixed(2)}/hr <span style={{ fontSize: '0.65rem', color: '#555' }}>✎</span>
                              </div>
                            )}
                          </div>
                          <div>{statusBadge(emp.employee_type || 'w2')}</div>
                          <div style={{ fontSize: '0.8rem', color: '#555' }}>{formatDate(emp.created_at)}</div>
                          <div style={{ fontSize: '0.8rem', color: '#555' }}>›</div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

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
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Time Entries</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{timeEntries?.length ?? 0} total entries</p>
                </div>
                {/* Feature 4: CSV Export */}
                {timeEntries?.length > 0 && (
                  <button
                    onClick={exportTimeEntriesCSV}
                    style={{ background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.14)' }}
                    onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.08)' }}
                  >
                    ⬇ Export CSV
                  </button>
                )}
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!timeEntries?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>No time entries yet</div>
                ) : (
                  <>
                    {!isMobile && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Employee', 'Date', 'In', 'Out', 'Hours', 'Location', 'Status'].map(h => (
                          <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {timeEntries.map((entry: any, i: number) => (
                      <div key={entry.id} style={isMobile ? { padding: '0.875rem 1rem', borderBottom: i < timeEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' } : {}}>
                        {isMobile ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>{empInitial(entry)}</div>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{empName(entry)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{entry.hours_worked?.toFixed(2) ?? '—'}h</span>
                                {statusBadge(entry.approval_status)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#555' }}>
                              <span>{formatDate(entry.clock_in)}</span>
                              <span>{formatTime(entry.clock_in)} → {entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: '#22c55e', fontWeight: '700' }}>Live</span>}</span>
                            </div>
                            {entry.notes && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#555', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: '0.5rem' }}>"{entry.notes}"</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div
                              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: (!entry.notes && i < timeEntries.length - 1) ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                              onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>{empInitial(entry)}</div>
                                <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{empName(entry)}</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>{formatDate(entry.clock_in)}</div>
                              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{formatTime(entry.clock_in)}</div>
                              <div style={{ fontSize: '0.8rem', color: entry.clock_out ? '#aaa' : '#22c55e', fontWeight: entry.clock_out ? 'normal' : '600' }}>{entry.clock_out ? formatTime(entry.clock_out) : '● Live'}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{entry.hours_worked?.toFixed(2) ?? '—'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>{entry.location_name ? `📍 ${entry.location_name}` : entry.latitude ? `📍 ${Number(entry.latitude).toFixed(3)}, ${Number(entry.longitude).toFixed(3)}` : '—'}</div>
                              <div>{statusBadge(entry.approval_status)}</div>
                            </div>
                            {entry.notes && (
                              <div style={{ padding: '0 1.5rem 0.875rem 1.5rem', borderBottom: i < timeEntries.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '0.5rem 0.875rem', fontSize: '0.78rem', color: '#666', borderLeft: '2px solid rgba(255,255,255,0.1)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#555', fontStyle: 'normal', fontWeight: '700' }}>NOTE:</span>"{entry.notes}"
                                </div>
                              </div>
                            )}
                          </>
                        )}
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
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Payroll</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{payroll?.length ?? 0} records · {pendingPayrollCount} pending</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Feature 3: Bulk Approve */}
                  {pendingPayrollCount > 0 && (
                    <button
                      onClick={handleBulkApprove}
                      disabled={bulkApproving}
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: bulkApproving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s', opacity: bulkApproving ? 0.6 : 1 }}
                      onMouseEnter={e => { if (!bulkApproving) (e.currentTarget).style.background = 'rgba(34,197,94,0.18)' }}
                      onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(34,197,94,0.1)' }}
                    >
                      {bulkApproving ? '⏳ Approving...' : `✓ Approve All Pending (${pendingPayrollCount})`}
                    </button>
                  )}
                  {/* Feature 4: CSV Export */}
                  {payroll?.length > 0 && (
                    <button
                      onClick={exportPayrollCSV}
                      style={{ background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.14)' }}
                      onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(0,217,255,0.08)' }}
                    >
                      ⬇ Export CSV
                    </button>
                  )}
                  {/* Accountant Payroll Report */}
                  {payroll?.length > 0 && (
                    <button
                      onClick={() => {
                        const end = new Date().toISOString().slice(0, 10)
                        const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
                        window.open(`/owner/payroll/report?start=${start}&end=${end}`, '_blank')
                      }}
                      style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(167,139,250,0.15)' }}
                      onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(167,139,250,0.08)' }}
                    >
                      📄 Accountant Report
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk approve result banner */}
              {bulkApproveMsg && (
                <div style={{ background: bulkApproveMsg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${bulkApproveMsg.startsWith('✓') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: bulkApproveMsg.startsWith('✓') ? '#22c55e' : '#ef4444', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
                  {bulkApproveMsg}
                </div>
              )}

              {pendingPayrollCount > 0 && !bulkApproveMsg && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f59e0b' }}>{pendingPayrollCount} payroll {pendingPayrollCount === 1 ? 'record' : 'records'} need your approval</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.15rem' }}>Use "Approve All" above or approve individually below.</div>
                  </div>
                </div>
              )}

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!payroll?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>No payroll records yet</div>
                ) : (
                  <>
                    {!isMobile && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Employee', 'Week', 'Hours', 'Gross', 'Tax 🐷', 'Net Pay', 'Status', 'Action'].map(h => (
                          <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {payroll.map((pr: any, i: number) => {
                      const gross = pr.total_amount || 0
                      const taxWithheld = pr.tax_withheld || 0
                      const net = pr.net_amount ?? gross
                      const empLabel = pr.employees?.users?.full_name || pr.employees?.users?.email?.split('@')[0] || '—'
                      const actionBtn = pr.status === 'pending' ? (
                        <button onClick={() => handlePayrollAction(pr.id, 'approved')} disabled={payrollUpdating === pr.id}
                          style={{ padding: '0.375rem 0.875rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}>
                          ✓ Approve
                        </button>
                      ) : pr.status === 'approved' ? (
                        <button onClick={() => handlePayrollAction(pr.id, 'paid')} disabled={payrollUpdating === pr.id}
                          style={{ padding: '0.375rem 0.875rem', background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.3)', color: '#00d9ff', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}>
                          💸 Mark Paid
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>✓ Paid</span>
                      )
                      return isMobile ? (
                        /* Mobile: card */
                        <div key={pr.id} style={{ padding: '1rem', borderBottom: i < payroll.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{empLabel}</div>
                              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Week of {pr.week_ending} · {pr.total_hours}h</div>
                            </div>
                            {statusBadge(pr.status)}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#22c55e' }}>${net.toFixed(2)}</span>
                              <span style={{ fontSize: '0.75rem', color: '#444', marginLeft: '0.5rem' }}>net · ${gross.toFixed(2)} gross</span>
                              {taxWithheld > 0 && <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.15rem' }}>🐷 ${taxWithheld.toFixed(2)} reserved</div>}
                            </div>
                            {actionBtn}
                          </div>
                        </div>
                      ) : (
                        /* Desktop: table row */
                        <div key={pr.id}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', alignItems: 'center', borderBottom: i < payroll.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{empLabel}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{pr.week_ending}</div>
                          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{pr.total_hours}h</div>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>${gross.toFixed(2)}</div>
                          <div style={{ fontSize: '0.85rem', color: taxWithheld > 0 ? '#f59e0b' : '#444' }}>{taxWithheld > 0 ? `$${taxWithheld.toFixed(2)}` : '—'}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#22c55e' }}>${net.toFixed(2)}</div>
                          <div>{statusBadge(pr.status)}</div>
                          <div>{actionBtn}</div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>Settings</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>Company preferences and pay schedule</p>
              </div>

              {/* Company name */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>Company Info</div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '600', marginBottom: '0.5rem' }}>Company Name</label>
                <input
                  type="text"
                  value={settingsCompanyName}
                  onChange={e => setSettingsCompanyName(e.target.value)}
                  placeholder="Your Company LLC"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' } as React.CSSProperties}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Pay Schedule */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Pay Schedule</div>
                <div style={{ fontSize: '0.8rem', color: '#444', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  How often do your employees get paid? This affects payroll periods.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[
                    { value: 'weekly', label: 'Weekly', desc: 'Every 7 days', icon: '📅' },
                    { value: 'biweekly', label: 'Bi-Weekly', desc: 'Every 2 weeks', icon: '📆' },
                    { value: 'semimonthly', label: 'Semi-Monthly', desc: '1st & 15th', icon: '🗓' },
                    { value: 'monthly', label: 'Monthly', desc: 'Once a month', icon: '📋' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSettingsPaySchedule(opt.value)}
                      style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${settingsPaySchedule === opt.value ? '#00d9ff' : 'rgba(255,255,255,0.06)'}`, background: settingsPaySchedule === opt.value ? 'rgba(0,217,255,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' } as React.CSSProperties}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{opt.icon}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: settingsPaySchedule === opt.value ? '#fff' : '#888', marginBottom: '0.2rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.72rem', color: settingsPaySchedule === opt.value ? '#00d9ff' : '#444' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {settingsMigrationNeeded && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f59e0b' }}>
                  ⚙️ Run this in Supabase SQL Editor to save pay schedule:<br />
                  <code style={{ display: 'block', marginTop: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', color: '#ccc' }}>
                    {'ALTER TABLE companies ADD COLUMN IF NOT EXISTS pay_schedule TEXT DEFAULT \'weekly\';'}
                  </code>
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                style={{ padding: '0.875rem 2rem', background: settingsSaved ? 'rgba(34,197,94,0.15)' : '#00d9ff', border: settingsSaved ? '1px solid rgba(34,197,94,0.3)' : 'none', color: settingsSaved ? '#22c55e' : '#000', borderRadius: '10px', fontWeight: '800', cursor: settingsSaving ? 'not-allowed' : 'pointer', fontSize: '0.95rem', opacity: settingsSaving ? 0.6 : 1 } as React.CSSProperties}
              >
                {settingsSaved ? '✓ Saved!' : settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c0c0c', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom, 0px)' } as React.CSSProperties}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'billing' ? router.push('/owner/billing') : setActiveTab(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                padding: '0.625rem 0.25rem',
                border: 'none',
                background: 'transparent',
                color: activeTab === item.id ? '#00d9ff' : '#555',
                cursor: 'pointer',
                position: 'relative',
              } as React.CSSProperties}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: activeTab === item.id ? '800' : '500', letterSpacing: '0.03em' }}>{item.label}</span>
              {item.id === 'payroll' && pendingPayrollCount > 0 && (
                <span style={{ position: 'absolute', top: '6px', right: 'calc(50% - 18px)', background: '#f59e0b', color: '#000', fontSize: '0.55rem', fontWeight: '900', padding: '0.1rem 0.35rem', borderRadius: '100px', lineHeight: 1.4 } as React.CSSProperties}>
                  {pendingPayrollCount}
                </span>
              )}
              {activeTab === item.id && (
                <span style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: '2px', background: '#00d9ff', borderRadius: '0 0 2px 2px' } as React.CSSProperties} />
              )}
            </button>
          ))}
          {/* Invite button */}
          <button
            onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', padding: '0.625rem 0.25rem', border: 'none', background: 'transparent', color: '#00d9ff', cursor: 'pointer' } as React.CSSProperties}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>➕</span>
            <span style={{ fontSize: '0.6rem', fontWeight: '700' }}>Invite</span>
          </button>
        </nav>
      )}

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

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
                  {(['email', 'sms'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInviteMethod(m)}
                      style={{ flex: 1, padding: '0.6rem', background: inviteMethod === m ? '#00d9ff' : 'transparent', color: inviteMethod === m ? '#000' : '#666', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {m === 'email' ? '✉️ Email' : '📱 SMS'}
                    </button>
                  ))}
                </div>

                {inviteMethod === 'email' ? (
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
                ) : (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                      placeholder="+12025551234"
                      autoFocus
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' } as React.CSSProperties}
                      onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.4rem' }}>Include country code (e.g. +1 for US)</div>
                  </div>
                )}

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
                    disabled={inviteSending || (inviteMethod === 'email' ? !inviteEmail : !invitePhone)}
                    style={{ flex: 1, padding: '0.9rem', background: (inviteSending || (inviteMethod === 'email' ? !inviteEmail : !invitePhone)) ? 'rgba(0,217,255,0.3)' : '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: (inviteSending || (inviteMethod === 'email' ? !inviteEmail : !invitePhone)) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                  >
                    {inviteSending ? 'Sending...' : inviteMethod === 'email' ? '✉️ Send Invite' : '📱 Send SMS'}
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
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{inviteResult.emailSent ? '✉️' : inviteResult.smsSent ? '📱' : '🔗'}</div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '900', color: inviteResult.success ? '#22c55e' : '#ef4444' }}>
                    {inviteResult.emailSent ? 'Email Sent!' : inviteResult.smsSent ? 'SMS Sent!' : 'Share This Link'}
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
                    onClick={() => { setInviteEmail(''); setInviteName(''); setInvitePhone(''); setInviteResult(null) }}
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
