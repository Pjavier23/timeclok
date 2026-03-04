'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'
import { LanguageToggle } from '../../components/LanguageToggle'

type Tab = 'overview' | 'employees' | 'payroll' | 'timeentries' | 'schedule' | 'timeoff' | 'billing' | 'settings'

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLang()

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
  // Schedules
  const [schedules, setSchedules] = useState<any[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [showShiftForm, setShowShiftForm] = useState(false)

  // Time off
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([])
  const [timeOffLoaded, setTimeOffLoaded] = useState(false)
  const [timeOffActioning, setTimeOffActioning] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [shiftForm, setShiftForm] = useState({ employee_id: '', shift_date: '', start_time: '09:00', end_time: '17:00', location: '', notes: '' })
  const [shiftSaving, setShiftSaving] = useState(false)
  const [scheduleMigrationNeeded, setScheduleMigrationNeeded] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [activityEmployeeFilter, setActivityEmployeeFilter] = useState<string>('all')
  const [payrollEmployeeFilter, setPayrollEmployeeFilter] = useState<string>('all')
  const [payrollDateStart, setPayrollDateStart] = useState<string>('')
  const [payrollDateEnd, setPayrollDateEnd] = useState<string>('')
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

  const fetchSchedules = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setScheduleLoading(true)
    const res = await fetch('/api/owner/schedules', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const json = await res.json()
    setSchedules(json.schedules || [])
    if (json.migrationNeeded) setScheduleMigrationNeeded(true)
    setScheduleLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'schedule') fetchSchedules()
  }, [activeTab, fetchSchedules])

  useEffect(() => {
    if (activeTab !== 'timeoff' || timeOffLoaded) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/owner/time-off', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json()
      setTimeOffRequests(json.requests || [])
      setTimeOffLoaded(true)
    }
    load()
  }, [activeTab, timeOffLoaded])

  const handleTimeOffAction = async (id: string, action: 'approve' | 'deny', denial_reason?: string) => {
    setTimeOffActioning(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/owner/time-off', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id, action, denial_reason }),
      })
      const json = await res.json()
      if (res.ok) {
        setTimeOffRequests(prev => prev.map(r => r.id === id ? { ...r, ...json.request } : r))
        setDenyingId(null)
        setDenyReason('')
      }
    } finally {
      setTimeOffActioning(null)
    }
  }

  const handleCreateShift = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setShiftSaving(true)
    const res = await fetch('/api/owner/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(shiftForm),
    })
    const json = await res.json()
    setShiftSaving(false)
    if (json.schedule) {
      setSchedules(prev => [...prev, json.schedule].sort((a, b) => a.shift_date.localeCompare(b.shift_date)))
      setShowShiftForm(false)
      setShiftForm({ employee_id: '', shift_date: '', start_time: '09:00', end_time: '17:00', location: '', notes: '' })
    }
    if (json.migrationNeeded) setScheduleMigrationNeeded(true)
  }

  const handleDeleteShift = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/owner/schedules', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id }) })
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

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
    // Validate based on selected method
    if (inviteMethod === 'email' && !inviteEmail) return
    if (inviteMethod === 'sms' && !invitePhone) return

    setInviteSending(true)
    setInviteResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setInviteSending(false); return }

    try {
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
      if (!res.ok && !json.success) {
        setInviteResult({ success: false, inviteUrl: '', message: json.error || 'Something went wrong. Please try again.' })
      } else {
        setInviteResult(json)
        if (json.success) await fetchData()
      }
    } catch (e: any) {
      setInviteResult({ success: false, inviteUrl: '', message: 'Network error — check your connection and try again.' })
    }
    setInviteSending(false)
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
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{t.loading.toUpperCase()}</div>
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
    const labelMap: Record<string, string> = {
      pending: t.pending,
      approved: t.approved,
      paid: t.paid,
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', color, background: bg }}>
        {labelMap[status] ?? status}
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

  const rawActivityFeed = buildActivityFeed()
  const activityFeed = activityEmployeeFilter === 'all'
    ? rawActivityFeed
    : rawActivityFeed.filter(item => {
        const emp = employees?.find((e: any) =>
          (e.users?.full_name || e.users?.email?.split('@')[0] || '') === item.name
        )
        return emp?.id === activityEmployeeFilter
      })

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview', icon: '▦', label: t.overview },
    { id: 'employees', icon: '⬡', label: t.employees },
    { id: 'timeentries', icon: '◷', label: t.timeEntries },
    { id: 'payroll', icon: '◈', label: t.payroll },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'timeoff', icon: '🏖️', label: 'Time Off' },
    { id: 'billing', icon: '💳', label: t.billing },
  ]

  const pendingTimeOffCount = timeOffRequests.filter(r => r.status === 'pending').length

  const pendingPayrollCount = (payroll || []).filter((p: any) => p.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', overflowX: 'hidden' } as React.CSSProperties}>

      {/* ── TOP NAV ── */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxSizing: 'border-box', width: '100%' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <a href="/owner/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>⏱</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
          </a>
          {company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', flexShrink: 0 }}>›</span>
              <span style={{ fontSize: '0.75rem', color: '#00d9ff', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '100px' : '160px', background: 'rgba(0,217,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,217,255,0.2)' } as React.CSSProperties}>{company.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {activeSessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.25rem 0.6rem', borderRadius: '100px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>{activeSessions.length} {isMobile ? '' : t.workingNow}</span>
            </div>
          )}
          {pendingPayrollCount > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.25rem 0.6rem', borderRadius: '100px', fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }} onClick={() => setActiveTab('payroll')}>
              ⚠ {pendingPayrollCount}
            </div>
          )}
          <LanguageToggle />
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', flexShrink: 0 } as React.CSSProperties}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#666' }}
          >
            {isMobile ? '↩' : t.signOut}
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
                {item.id === 'timeoff' && pendingTimeOffCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: '800', padding: '0.15rem 0.45rem', borderRadius: '100px' }}>
                    {pendingTimeOffCount}
                  </span>
                )}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.12)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.growYourTeam}</div>
              <button
                onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                style={{ width: '100%', padding: '0.5rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                + {t.inviteEmployee}
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{company?.name || t.dashboard}</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stat cards — all clickable */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: t.totalEmployees, value: stats?.employeeCount ?? 0, icon: '👥', color: '#00d9ff', sub: t.tapToViewAll, tab: 'employees' as Tab },
                  { label: t.workingNow, value: activeSessions.length, icon: '🟢', color: '#22c55e', sub: t.tapToSeeWho, tab: 'timeentries' as Tab },
                  { label: t.hoursThisWeek, value: `${stats?.weeklyHours ?? 0}h`, icon: '📊', color: '#a78bfa', sub: t.tapToViewEntries, tab: 'timeentries' as Tab },
                  { label: t.pendingPayroll, value: `$${(stats?.pendingPayrollTotal ?? 0).toFixed(0)}`, icon: '💰', color: '#f59e0b', sub: t.tapToApprove, tab: 'payroll' as Tab },
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
                      <div style={{ fontWeight: '800', fontSize: '1rem' }}>{t.liveAttendance}</div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>{activeSessions.length} of {employees.length} {t.clockedIn.toLowerCase()} right now</div>
                    </div>
                    <button
                      onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                      style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      + {t.inviteEmployee.split(' ')[0]}
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
                              {isClockedIn ? `⏱ ${t.since} ${formatTime(active.clock_in)}` : t.offClock}
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
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: employees?.length > 0 ? '0.75rem' : 0 }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem' }}>{t.recentActivity}</div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.1rem' }}>Clock-ins, clock-outs &amp; payroll</div>
                    </div>
                    <button onClick={() => setActiveTab('timeentries')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', padding: '0.3rem 0.5rem' }}>{t.viewAll}</button>
                  </div>
                  {/* Employee filter */}
                  {employees?.length > 0 && (
                    <select
                      value={activityEmployeeFilter}
                      onChange={e => { setActivityEmployeeFilter(e.target.value); setShowAllActivity(false) }}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: activityEmployeeFilter === 'all' ? '#666' : '#fff', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' } as React.CSSProperties}
                    >
                      <option value="all">👥 All Employees</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.users?.full_name || emp.users?.email?.split('@')[0] || 'Employee'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {activityFeed.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏰</div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{t.noActivityYet}</div>
                    <div style={{ fontSize: '0.8rem' }}>{t.inviteEmployeesMsg}</div>
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    {(showAllActivity ? activityFeed : activityFeed.slice(0, 5)).map((item, i) => {
                      const visibleFeed = showAllActivity ? activityFeed : activityFeed.slice(0, 5)
                      const config = {
                        clock_in: { dot: '#22c55e', icon: '🟢', label: 'clocked in', dotColor: 'rgba(34,197,94,0.15)' },
                        clock_out: { dot: '#ef4444', icon: '🔴', label: 'clocked out', dotColor: 'rgba(239,68,68,0.15)' },
                        payroll: { dot: '#f59e0b', icon: '💰', label: 'payroll', dotColor: 'rgba(245,158,11,0.15)' },
                      }[item.type]

                      return (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: i < visibleFeed.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: config.dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>
                            {config.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: '700', color: '#fff' }}>{item.name}</span>
                              <span style={{ color: '#555', marginLeft: '0.35rem' }}>{item.detail}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#444', flexShrink: 0, whiteSpace: 'nowrap' } as React.CSSProperties}>
                            {item.time}
                          </div>
                        </div>
                      )
                    })}
                    {/* View All / Show Less toggle */}
                    {activityFeed.length > 5 && (
                      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                          onClick={() => setShowAllActivity(v => !v)}
                          style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                        >
                          {showAllActivity ? `▲ Show Less` : `▼ View All (${activityFeed.length - 5} more)`}
                        </button>
                      </div>
                    )}
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
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{t.employees}</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>{employees?.length ?? 0} team members</p>
                </div>
                <button
                  onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                  style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>+</span> {t.inviteEmployee}
                </button>
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!employees?.length ? (
                  <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>{t.noEmployeesYet}</div>
                    <div style={{ fontSize: '0.875rem', color: '#555', marginBottom: '1.5rem' }}>{t.inviteFirstEmployee}</div>
                    <button onClick={() => setShowInviteModal(true)} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem' }}>
                      {t.sendFirstInvite}
                    </button>
                  </div>
                ) : (
                  <>
                    {!isMobile && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 0.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {[t.employee_label, 'Email', t.rate, t.type, t.since, ''].map(h => (
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
                              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#00d9ff' }}>${emp.hourly_rate?.toFixed(0)}/hr</div>
                              <div style={{ fontSize: '0.7rem', color: '#555' }}>›</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {statusBadge(emp.employee_type || 'w2')}
                            <span style={{ fontSize: '0.72rem', color: '#444' }}>{t.joined} {formatDate(emp.created_at)}</span>
                            {isActive && <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>● {t.workingNow}</span>}
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
                          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#00d9ff' }}>
                            ${emp.hourly_rate?.toFixed(2)}/hr
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
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t.shareInviteLink}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555' }}>{t.inviteLinkDesc}</div>
                </div>
                <button
                  onClick={copyInviteLink}
                  style={{ background: copiedLink ? 'rgba(34,197,94,0.15)' : 'rgba(0,217,255,0.1)', border: `1px solid ${copiedLink ? 'rgba(34,197,94,0.3)' : 'rgba(0,217,255,0.25)'}`, color: copiedLink ? '#22c55e' : '#00d9ff', padding: '0.625rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: 'all 0.2s', whiteSpace: 'nowrap' } as React.CSSProperties}
                >
                  {copiedLink ? t.copied : t.copyLink}
                </button>
              </div>
            </div>
          )}

          {/* ── TIME ENTRIES TAB ── */}
          {activeTab === 'timeentries' && (
            <div>
              <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>{t.timeEntries}</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.82rem' }}>{timeEntries?.length ?? 0} entries</p>
                </div>
                {timeEntries?.length > 0 && (
                  <button onClick={exportTimeEntriesCSV} style={{ background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ⬇ {t.exportCSV}
                  </button>
                )}
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {!timeEntries?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>{t.noTimeEntries}</div>
                ) : (
                  <div style={{ padding: '0.5rem' }}>
                    {timeEntries.map((entry: any, i: number) => {
                      const isLive = !entry.clock_out
                      const hrs = entry.hours_worked?.toFixed(1) ?? '—'
                      const loc = entry.location_name || (entry.latitude ? `${Number(entry.latitude).toFixed(2)}, ${Number(entry.longitude).toFixed(2)}` : null)
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 0.875rem', borderRadius: '10px', marginBottom: i < timeEntries.length - 1 ? '0.25rem' : '0', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.03)' }}
                          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}>
                          {/* Avatar */}
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', border: `1px solid ${isLive ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.06)'}`, flexShrink: 0 }}>
                            {empInitial(entry)}
                          </div>
                          {/* Main info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{empName(entry)}</span>
                              {isLive && <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: '800', padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#555', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } as React.CSSProperties}>
                              <span>{formatDate(entry.clock_in)}</span>
                              <span style={{ color: '#444' }}>·</span>
                              <span>{formatTime(entry.clock_in)} → {entry.clock_out ? formatTime(entry.clock_out) : 'now'}</span>
                              {loc && <><span style={{ color: '#444' }}>·</span><span>📍 {loc}</span></>}
                            </div>
                            {entry.notes && <div style={{ fontSize: '0.73rem', color: '#444', marginTop: '0.2rem', fontStyle: 'italic' }}>"{entry.notes}"</div>}
                          </div>
                          {/* Hours + status */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: isLive ? '#22c55e' : '#fff', marginBottom: '0.25rem' }}>{hrs}h</div>
                            {statusBadge(entry.approval_status)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PAYROLL TAB ── */}
          {activeTab === 'payroll' && (
            <div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{t.payroll}</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>
                    {(() => {
                      const filtered = (payroll || []).filter((pr: any) => {
                        if (payrollEmployeeFilter !== 'all' && pr.employee_id !== payrollEmployeeFilter) return false
                        if (payrollDateStart && pr.week_ending < payrollDateStart) return false
                        if (payrollDateEnd && pr.week_ending > payrollDateEnd) return false
                        return true
                      })
                      return `${filtered.length} record${filtered.length !== 1 ? 's' : ''}${filtered.length !== payroll?.length ? ` (filtered from ${payroll?.length})` : ''} · ${pendingPayrollCount} pending`
                    })()}
                  </p>
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
                      {bulkApproving ? '⏳ Approving...' : `✓ ${t.approveAllPending} (${pendingPayrollCount})`}
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
                      ⬇ {t.exportCSV}
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
                      {t.accountantReport}
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
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f59e0b' }}>{pendingPayrollCount} {pendingPayrollCount === 1 ? t.needApproval : t.needsApproval}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.15rem' }}>{t.approveIndividually}</div>
                  </div>
                </div>
              )}

              {/* Filters: Employee + Date Range */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Filter:</span>
                {/* Employee filter */}
                <select
                  value={payrollEmployeeFilter}
                  onChange={e => setPayrollEmployeeFilter(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: payrollEmployeeFilter === 'all' ? '#666' : '#fff', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties}
                >
                  <option value="all">👥 All Employees</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.users?.full_name || emp.users?.email?.split('@')[0] || 'Employee'}
                    </option>
                  ))}
                </select>
                {/* Date range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={payrollDateStart}
                    onChange={e => setPayrollDateStart(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: payrollDateStart ? '#fff' : '#555', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' } as React.CSSProperties}
                  />
                  <span style={{ color: '#444', fontSize: '0.8rem' }}>→</span>
                  <input
                    type="date"
                    value={payrollDateEnd}
                    onChange={e => setPayrollDateEnd(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: payrollDateEnd ? '#fff' : '#555', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' } as React.CSSProperties}
                  />
                  {(payrollDateStart || payrollDateEnd || payrollEmployeeFilter !== 'all') && (
                    <button
                      onClick={() => { setPayrollDateStart(''); setPayrollDateEnd(''); setPayrollEmployeeFilter('all') }}
                      style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '6px' }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                {(() => {
                  const filteredPayroll = (payroll || []).filter((pr: any) => {
                    if (payrollEmployeeFilter !== 'all' && pr.employee_id !== payrollEmployeeFilter) return false
                    if (payrollDateStart && pr.week_ending < payrollDateStart) return false
                    if (payrollDateEnd && pr.week_ending > payrollDateEnd) return false
                    return true
                  })
                  return !filteredPayroll.length ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>
                      {payroll?.length ? 'No records match your filters.' : t.noPayrollRecordsYet}
                    </div>
                  ) : null
                })()}
                {!payroll?.length ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>{t.noPayrollRecordsYet}</div>
                ) : (
                  <>
                    {!isMobile && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', padding: '0.875rem 1.5rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {[t.employee_label, t.week, t.hours, t.gross, t.taxPig, t.netPayLabel, t.status, t.action].map(h => (
                          <div key={h} style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {payroll.filter((pr: any) => {
                      if (payrollEmployeeFilter !== 'all' && pr.employee_id !== payrollEmployeeFilter) return false
                      if (payrollDateStart && pr.week_ending < payrollDateStart) return false
                      if (payrollDateEnd && pr.week_ending > payrollDateEnd) return false
                      return true
                    }).map((pr: any, i: number) => {
                      const gross = pr.total_amount || 0
                      const taxWithheld = pr.tax_withheld || 0
                      const net = pr.net_amount ?? gross
                      const empLabel = pr.employees?.users?.full_name || pr.employees?.users?.email?.split('@')[0] || '—'
                      const actionBtn = pr.status === 'pending' ? (
                        <button onClick={() => handlePayrollAction(pr.id, 'approved')} disabled={payrollUpdating === pr.id}
                          style={{ padding: '0.375rem 0.875rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}>
                          ✓ {t.approve}
                        </button>
                      ) : pr.status === 'approved' ? (
                        <button onClick={() => handlePayrollAction(pr.id, 'paid')} disabled={payrollUpdating === pr.id}
                          style={{ padding: '0.375rem 0.875rem', background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.3)', color: '#00d9ff', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', opacity: payrollUpdating === pr.id ? 0.5 : 1 }}>
                          {t.markPaid}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>✓ {t.paid}</span>
                      )
                      return isMobile ? (
                        /* Mobile: card */
                        <div key={pr.id} style={{ padding: '1rem', borderBottom: i < payroll.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{empLabel}</div>
                              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>{t.weekOfLabel} {pr.week_ending} · {pr.total_hours}h</div>
                            </div>
                            {statusBadge(pr.status)}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#22c55e' }}>${net.toFixed(2)}</span>
                              <span style={{ fontSize: '0.75rem', color: '#444', marginLeft: '0.5rem' }}>{t.netPay.toLowerCase()} · ${gross.toFixed(2)} {t.gross.toLowerCase()}</span>
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

          {/* ── SCHEDULE TAB ── */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>📅 Schedule</h1>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>Assign shifts to your employees — they'll see it on their dashboard</p>
                </div>
                <button onClick={() => setShowShiftForm(true)} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.875rem' }}>
                  + Add Shift
                </button>
              </div>

              {scheduleMigrationNeeded && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.4rem' }}>⚠️ Database setup required</div>
                  <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>Run this SQL in your Supabase SQL Editor to enable schedules:</div>
                  <code style={{ display: 'block', background: '#0f0f0f', padding: '0.875rem', borderRadius: '8px', fontSize: '0.78rem', color: '#00d9ff', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } as React.CSSProperties}>
                    {`CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_company ON schedules(company_id);`}
                  </code>
                </div>
              )}

              {/* Add shift form */}
              {showShiftForm && (
                <div style={{ background: '#1a1a1a', border: '1px solid rgba(0,217,255,0.2)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '800' }}>New Shift</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Employee *</label>
                      <select value={shiftForm.employee_id} onChange={e => setShiftForm(p => ({...p, employee_id: e.target.value}))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: shiftForm.employee_id ? '#fff' : '#555', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties}>
                        <option value="">Select employee...</option>
                        {employees?.map((emp: any) => (
                          <option key={emp.id} value={emp.id}>{emp.users?.full_name || emp.users?.email?.split('@')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Date *</label>
                      <input type="date" value={shiftForm.shift_date} onChange={e => setShiftForm(p => ({...p, shift_date: e.target.value}))}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Start Time *</label>
                      <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(p => ({...p, start_time: e.target.value}))}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>End Time *</label>
                      <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(p => ({...p, end_time: e.target.value}))}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Location</label>
                      <input type="text" value={shiftForm.location} onChange={e => setShiftForm(p => ({...p, location: e.target.value}))} placeholder="123 Main St or Job site name"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Notes</label>
                      <input type="text" value={shiftForm.notes} onChange={e => setShiftForm(p => ({...p, notes: e.target.value}))} placeholder="Optional notes for employee"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleCreateShift} disabled={shiftSaving || !shiftForm.employee_id || !shiftForm.shift_date}
                      style={{ background: (!shiftForm.employee_id || !shiftForm.shift_date) ? 'rgba(0,217,255,0.3)' : '#00d9ff', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', opacity: shiftSaving ? 0.6 : 1 }}>
                      {shiftSaving ? 'Saving...' : 'Save Shift'}
                    </button>
                    <button onClick={() => setShowShiftForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#555', padding: '0.75rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Schedule list */}
              {scheduleLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>Loading schedules...</div>
              ) : schedules.length === 0 ? (
                <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
                  <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>No shifts scheduled</div>
                  <div style={{ fontSize: '0.85rem', color: '#555' }}>Add shifts and your employees will see them on their dashboard</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {schedules.map((shift: any) => {
                    const empName = shift.employees?.users?.full_name || shift.employees?.users?.email?.split('@')[0] || 'Employee'
                    const isToday = shift.shift_date === new Date().toISOString().slice(0, 10)
                    const isPast = shift.shift_date < new Date().toISOString().slice(0, 10)
                    return (
                      <div key={shift.id} style={{ background: '#1a1a1a', border: `1px solid ${isToday ? 'rgba(0,217,255,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '1rem 1.25rem', opacity: isPast ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                              {isToday && <span style={{ fontSize: '0.68rem', background: 'rgba(0,217,255,0.15)', color: '#00d9ff', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today</span>}
                              {isPast && <span style={{ fontSize: '0.68rem', color: '#444', fontWeight: '700' }}>Past</span>}
                              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{empName}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>
                              {new Date(shift.shift_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              {' · '}
                              <span style={{ color: '#00d9ff', fontWeight: '700' }}>{shift.start_time.slice(0,5)} – {shift.end_time.slice(0,5)}</span>
                            </div>
                            {shift.location && <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.2rem' }}>📍 {shift.location}</div>}
                            {shift.notes && <div style={{ fontSize: '0.78rem', color: '#444', marginTop: '0.2rem', fontStyle: 'italic' }}>"{shift.notes}"</div>}
                          </div>
                          <button onClick={() => handleDeleteShift(shift.id)}
                            style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', flexShrink: 0 }}
                            onMouseEnter={e => { (e.currentTarget).style.color = '#ef4444' }}
                            onMouseLeave={e => { (e.currentTarget).style.color = '#333' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TIME OFF TAB ── */}
          {activeTab === 'timeoff' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>🏖️ Time Off</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>Review and respond to employee time off requests</p>
              </div>

              {/* Pending requests */}
              {(() => {
                const pending = timeOffRequests.filter(r => r.status === 'pending')
                const rest = timeOffRequests.filter(r => r.status !== 'pending')
                const typeEmoji: Record<string, string> = { vacation: '🌴', sick: '🤒', personal: '👤', other: '📌' }

                return (
                  <>
                    {/* Pending section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                        Pending ({pending.length})
                      </div>
                      {pending.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#444', fontSize: '0.875rem' }}>
                          No pending requests 🎉
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {pending.map((req: any) => {
                            const empName = req.employees?.users?.full_name || req.employees?.users?.email || 'Employee'
                            return (
                              <div key={req.id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{empName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.15rem' }}>
                                      {typeEmoji[req.type] || '📌'} {req.type.charAt(0).toUpperCase() + req.type.slice(1)} · {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                                    </div>
                                    {req.notes && <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.25rem' }}>{req.notes}</div>}
                                  </div>
                                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', flexShrink: 0 }}>🟡 Pending</span>
                                </div>

                                {/* Deny reason input */}
                                {denyingId === req.id && (
                                  <div style={{ marginBottom: '0.75rem' }}>
                                    <input
                                      type="text"
                                      value={denyReason}
                                      onChange={e => setDenyReason(e.target.value)}
                                      placeholder="Reason for denial (optional)"
                                      autoFocus
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.625rem 0.875rem', color: '#fff', fontSize: '0.85rem', outline: 'none' } as React.CSSProperties}
                                    />
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.625rem' }}>
                                  <button
                                    onClick={() => handleTimeOffAction(req.id, 'approve')}
                                    disabled={timeOffActioning === req.id}
                                    style={{ flex: 1, padding: '0.625rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', opacity: timeOffActioning === req.id ? 0.5 : 1 } as React.CSSProperties}
                                  >
                                    ✅ Approve
                                  </button>
                                  {denyingId === req.id ? (
                                    <>
                                      <button
                                        onClick={() => handleTimeOffAction(req.id, 'deny', denyReason)}
                                        disabled={timeOffActioning === req.id}
                                        style={{ flex: 1, padding: '0.625rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', opacity: timeOffActioning === req.id ? 0.5 : 1 } as React.CSSProperties}
                                      >
                                        Confirm Deny
                                      </button>
                                      <button
                                        onClick={() => { setDenyingId(null); setDenyReason('') }}
                                        style={{ padding: '0.625rem 0.875rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' } as React.CSSProperties}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => setDenyingId(req.id)}
                                      style={{ flex: 1, padding: '0.625rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' } as React.CSSProperties}
                                    >
                                      ❌ Deny
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* History section */}
                    {rest.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {rest.map((req: any) => {
                            const empName = req.employees?.users?.full_name || req.employees?.users?.email || 'Employee'
                            const statusColors: Record<string, { color: string; bg: string }> = {
                              approved: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                              denied: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                            }
                            const sc = statusColors[req.status] || { color: '#888', bg: 'rgba(255,255,255,0.05)' }
                            return (
                              <div key={req.id} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>{empName}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.15rem' }}>
                                      {typeEmoji[req.type] || '📌'} {req.type.charAt(0).toUpperCase() + req.type.slice(1)} · {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                                    </div>
                                    {req.denial_reason && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem' }}>Reason: {req.denial_reason}</div>}
                                  </div>
                                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700', color: sc.color, background: sc.bg, flexShrink: 0 }}>
                                    {req.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{t.settings}</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '0.875rem' }}>Company preferences and pay schedule</p>
              </div>

              {/* Company name */}
              <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>{t.companyInfo}</div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '600', marginBottom: '0.5rem' }}>{t.companyName}</label>
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
                <div style={{ fontSize: '0.78rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>{t.paySchedule}</div>
                <div style={{ fontSize: '0.8rem', color: '#444', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {t.payScheduleDesc}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[
                    { value: 'weekly', label: t.weekly, desc: 'Every 7 days', icon: '📅' },
                    { value: 'biweekly', label: t.biWeekly, desc: 'Every 2 weeks', icon: '📆' },
                    { value: 'semimonthly', label: t.semiMonthly, desc: '1st & 15th', icon: '🗓' },
                    { value: 'monthly', label: t.monthly, desc: 'Once a month', icon: '📋' },
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
                {settingsSaved ? `✓ ${t.saved}` : settingsSaving ? `${t.loading}` : t.saveSettings}
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
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>{t.inviteEmployee}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
                    {inviteMethod === 'sms' ? t.inviteModalTitleSms : t.inviteModalTitleEmail}
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
                      {t.emailAddress}
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
                      {t.phoneNumber}
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
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.4rem' }}>{t.includeCountryCode}</div>
                  </div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                    {t.nameOptional}
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
                    {inviteSending ? t.loading : inviteMethod === 'email' ? `✉️ ${t.sendInviteBtn}` : `📱 ${t.sendInviteBtn}`}
                  </button>
                  <button
                    onClick={resetInviteModal}
                    style={{ padding: '0.9rem 1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget).style.color = '#999' }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#666' }}
                  >
                    {t.cancelBtn}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Status */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                    {inviteResult.emailSent ? '✉️' : inviteResult.smsSent ? '📱' : '🔗'}
                  </div>
                  <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: inviteResult.emailSent || inviteResult.smsSent ? '#22c55e' : '#fff' }}>
                    {inviteResult.emailSent ? 'Email Sent!' : inviteResult.smsSent ? 'SMS Sent!' : 'Send This Link to Your Employee'}
                  </h3>
                  {(inviteResult.emailSent || inviteResult.smsSent) && (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>Also share the link below as backup</p>
                  )}
                </div>

                {/* Big prominent invite link — always shown */}
                {inviteResult.inviteUrl && (
                  <div style={{ marginBottom: '1.25rem', background: 'rgba(0,217,255,0.06)', border: '2px solid rgba(0,217,255,0.25)', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#00d9ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      📋 Employee Invite Link
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa', wordBreak: 'break-all', marginBottom: '1rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' } as React.CSSProperties}>
                      {inviteResult.inviteUrl}
                    </div>
                    {/* Share buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.inviteUrl).catch(() => {})
                          setCopiedLink(true)
                          setTimeout(() => setCopiedLink(false), 3000)
                        }}
                        style={{ padding: '0.6rem 0.5rem', background: copiedLink ? 'rgba(34,197,94,0.15)' : 'rgba(0,217,255,0.12)', border: `1px solid ${copiedLink ? 'rgba(34,197,94,0.35)' : 'rgba(0,217,255,0.3)'}`, color: copiedLink ? '#22c55e' : '#00d9ff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', transition: 'all 0.2s' } as React.CSSProperties}
                      >
                        {copiedLink ? t.copied : t.copyLink}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to join our team on TimeClok! Create your account here: ${inviteResult.inviteUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '0.6rem 0.5rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25d366', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}
                      >
                        💬 WhatsApp
                      </a>
                      <a
                        href={`sms:?body=${encodeURIComponent(`Join our team on TimeClok: ${inviteResult.inviteUrl}`)}`}
                        style={{ padding: '0.6rem 0.5rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}
                      >
                        📱 Text
                      </a>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => { setInviteEmail(''); setInviteName(''); setInvitePhone(''); setInviteResult(null) }}
                    style={{ flex: 1, padding: '0.875rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    {t.inviteAnotherBtn}
                  </button>
                  <button
                    onClick={resetInviteModal}
                    style={{ padding: '0.875rem 1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {t.done}
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
