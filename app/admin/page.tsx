'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async (pw: string) => {
    setLoading(true)
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-password': pw },
    })
    if (res.status === 401) {
      setAuthError('Wrong password')
      setAuthed(false)
      setLoading(false)
      return
    }
    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setData(json)
      setAuthed(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStats(password)
  }

  const S = {
    page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f' },
    card: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2rem', width: '360px' },
    header: { background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 50 },
    content: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    statCard: (color: string) => ({ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', borderTop: `3px solid ${color}` }) as React.CSSProperties,
    statLabel: { fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: '600' },
    statValue: { fontSize: '2.5rem', fontWeight: '800' },
    tableCard: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' } as React.CSSProperties,
    tableHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    th: { padding: '0.75rem 1.5rem', textAlign: 'left' as const, fontSize: '0.75rem', color: '#666', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.875rem' },
  }

  const formatDate = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const isToday = (ts: string) => {
    const d = new Date(ts)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }

  const isThisWeek = (ts: string) => {
    const d = new Date(ts)
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    return d > weekAgo
  }

  if (!authed) {
    return (
      <div style={S.center}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#00d9ff' }}>⏱ TimeClok</div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>Admin Dashboard</div>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '0.875rem 1rem', color: '#fff',
                fontSize: '1rem', outline: 'none', marginBottom: '1rem',
              }}
            />
            {authError && <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{authError}</div>}
            <button type="submit" style={{ width: '100%', padding: '0.875rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ ...S.center, ...S.page }}><div style={{ color: '#666' }}>Loading...</div></div>
  }

  const { users, companies, stats } = data || {}
  const todaySignups = users?.filter((u: any) => isToday(u.created_at)) || []
  const weekSignups = users?.filter((u: any) => isThisWeek(u.created_at)) || []

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#00d9ff' }}>⏱ TimeClok Admin</div>
          <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>Internal Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => fetchStats(password)}
            style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.3)', color: '#00d9ff', padding: '0.4rem 0.875rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: '0.4rem 0.875rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ← Back to App
          </button>
        </div>
      </header>

      <div style={S.content}>
        {/* Stats */}
        <div style={S.grid}>
          <div style={S.statCard('#00d9ff')}>
            <div style={S.statLabel}>Total Signups</div>
            <div style={{ ...S.statValue, color: '#00d9ff' }}>{users?.length ?? 0}</div>
          </div>
          <div style={S.statCard('#22c55e')}>
            <div style={S.statLabel}>Today</div>
            <div style={{ ...S.statValue, color: '#22c55e' }}>{todaySignups.length}</div>
            {todaySignups.length > 0 && <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>🔥 New today!</div>}
          </div>
          <div style={S.statCard('#a78bfa')}>
            <div style={S.statLabel}>This Week</div>
            <div style={{ ...S.statValue, color: '#a78bfa' }}>{weekSignups.length}</div>
          </div>
          <div style={S.statCard('#f59e0b')}>
            <div style={S.statLabel}>Companies</div>
            <div style={{ ...S.statValue, color: '#f59e0b' }}>{companies?.length ?? 0}</div>
          </div>
          <div style={S.statCard('#ef4444')}>
            <div style={S.statLabel}>Unconfirmed</div>
            <div style={{ ...S.statValue, color: '#ef4444' }}>{users?.filter((u: any) => !u.confirmed).length ?? 0}</div>
          </div>
        </div>

        {/* Today's signups highlight */}
        {todaySignups.length > 0 && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: '700', color: '#22c55e', marginBottom: '0.75rem' }}>🔥 New Signups Today</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
              {todaySignups.map((u: any) => (
                <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: '600' }}>{u.email}</span>
                  <span style={{ color: '#555', fontSize: '0.8rem' }}>{formatDate(u.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All signups table */}
        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <span>All Signups ({users?.length ?? 0})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr>
                <th style={S.th}>Email</th>
                <th style={S.th}>Signed Up</th>
                <th style={S.th}>Confirmed</th>
                <th style={S.th}>Company</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.email} style={{ background: isToday(u.created_at) ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                  <td style={S.td}>
                    <span style={{ fontWeight: isToday(u.created_at) ? '700' : '400' }}>{u.email}</span>
                    {isToday(u.created_at) && <span style={{ marginLeft: '0.5rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>NEW</span>}
                  </td>
                  <td style={{ ...S.td, color: '#999' }}>{formatDate(u.created_at)}</td>
                  <td style={S.td}>
                    {u.confirmed
                      ? <span style={{ color: '#22c55e', fontWeight: '600' }}>✓ Yes</span>
                      : <span style={{ color: '#f59e0b' }}>⏳ Pending</span>}
                  </td>
                  <td style={{ ...S.td, color: '#666' }}>{u.company_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Migration helper */}
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.5rem' }}>⚙️ Pending: Run SQL Migration (1 min)</div>
          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1rem' }}>Open <strong>Supabase → SQL Editor</strong> and run this to activate the 🐷 Tax Reserve feature:</div>
          <pre style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: '#00d9ff', overflowX: 'auto' as const, margin: 0 }}>
{`ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS tax_reserve_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_reserve_per_period DECIMAL(10,2) DEFAULT 25.00;

ALTER TABLE public.payroll
  ADD COLUMN IF NOT EXISTS tax_withheld DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);`}
          </pre>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.75rem' }}>Also add <code style={{ color: '#f59e0b' }}>RESEND_API_KEY</code> in Vercel → Settings → Env Vars to activate email invites + signup alerts.</div>
        </div>

        {/* Companies table */}
        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <span>Companies ({companies?.length ?? 0})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr>
                <th style={S.th}>Company Name</th>
                <th style={S.th}>Owner</th>
                <th style={S.th}>Created</th>
                <th style={S.th}>Employees</th>
              </tr>
            </thead>
            <tbody>
              {companies?.map((c: any) => (
                <tr key={c.id}>
                  <td style={{ ...S.td, fontWeight: '600' }}>{c.name}</td>
                  <td style={{ ...S.td, color: '#999' }}>{c.owner_email || '—'}</td>
                  <td style={{ ...S.td, color: '#666' }}>{formatDate(c.created_at)}</td>
                  <td style={S.td}>{c.employee_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
