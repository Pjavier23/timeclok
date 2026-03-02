'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const SKIP_EMAILS = new Set([
  'demo.owner@timeclok.com', 'demo.employee@timeclok.com',
  'pedro@jastheshop.com', 'pjavier23@gmail.com', 'pedro@yahoo.com',
  'gbernaza@me.com', 'javiermultiservicesllc@gmail.com',
])
const SKIP_KEYWORDS = ['@test.com','@example.com','timeclok.test','test_','jointest_',
  'signuptest_','newtest_','testverify_','comprehensive','production@ready','seedtest',
  'working-test','fixed@','verify@company','fulltest','onboard@','client@company','anything@']
const isTest = (email: string) => {
  if (!email) return true
  const e = email.toLowerCase()
  if (SKIP_EMAILS.has(e)) return true
  return SKIP_KEYWORDS.some(k => e.includes(k))
}

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return iso }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [authed, setAuthed]   = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch]   = useState('')

  // Per-user action state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMsg, setActionMsg]         = useState<Record<string, string>>({})
  const [resetLinks, setResetLinks]       = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchStats = useCallback(async (pw: string) => {
    setLoading(true)
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-password': pw } })
    if (res.status === 401) { setAuthError('Wrong password'); setLoading(false); return }
    const json = await res.json()
    setData(json)
    setAuthed(true)
    setLoading(false)
  }, [])

  const doAction = async (action: string, userId: string, email: string, extra?: any) => {
    setActionLoading(userId + action)
    setActionMsg(m => ({ ...m, [userId]: '' }))
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ action, userId, email, ...extra }),
      })
      const json = await res.json()
      if (json.resetLink) {
        setResetLinks(l => ({ ...l, [userId]: json.resetLink }))
        setActionMsg(m => ({ ...m, [userId]: '🔗 Link generated — copy below' }))
      } else if (json.ok) {
        setActionMsg(m => ({ ...m, [userId]: json.message || '✅ Done' }))
        if (action === 'delete_user') {
          setData((d: any) => ({ ...d, users: d.users.filter((u: any) => u.id !== userId) }))
          setConfirmDelete(null)
        }
        if (action === 'confirm_email') fetchStats(password)
      } else {
        setActionMsg(m => ({ ...m, [userId]: '❌ ' + (json.error || 'Error') }))
      }
    } catch (e: any) {
      setActionMsg(m => ({ ...m, [userId]: '❌ ' + e.message }))
    }
    setActionLoading(null)
  }

  const s = {
    page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' } as React.CSSProperties,
    header: { background: '#0c0c0c', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 },
    content: { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
    card: (accent?: string) => ({ background: '#1a1a1a', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '12px', padding: '1.5rem', borderTop: accent ? `3px solid ${accent}` : undefined } as React.CSSProperties),
    btn: (color: string, bg: string) => ({ padding: '0.35rem 0.75rem', borderRadius: '6px', border: `1px solid ${color}40`, background: bg, color, fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' } as React.CSSProperties),
  }

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2.5rem', width: '360px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.25rem' }}>⚙️ Admin</div>
        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '2rem' }}>TimeClok owner dashboard</div>
        <form onSubmit={e => { e.preventDefault(); fetchStats(password) }}>
          <input
            type="password" autoFocus value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.875rem 1rem', color: '#fff', fontSize: '1rem', outline: 'none', marginBottom: '1rem' }}
          />
          {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.875rem', background: '#00d9ff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )

  const allUsers: any[] = data?.users || []
  const realUsers = allUsers.filter((u: any) => !isTest(u.email))
  const displayUsers = (showAll ? allUsers : realUsers)
    .filter((u: any) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.company_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '900', background: 'linear-gradient(135deg,#00d9ff,#0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>TimeClok</span>
          <span style={{ fontSize: '0.75rem', background: 'rgba(0,217,255,0.1)', color: '#00d9ff', border: '1px solid rgba(0,217,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '100px', fontWeight: '700' }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => fetchStats(password)} style={s.btn('#00d9ff', 'rgba(0,217,255,0.08)')}>↻ Refresh</button>
          <button onClick={() => router.push('/')} style={s.btn('#555', 'transparent')}>← Back to App</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Real Users', value: realUsers.length, color: '#00d9ff' },
            { label: 'Total Users', value: allUsers.length, color: '#555' },
            { label: 'Companies', value: data?.companies?.length ?? 0, color: '#22c55e' },
            { label: 'Confirmed', value: realUsers.filter((u:any) => u.confirmed).length, color: '#a78bfa' },
          ].map(c => (
            <div key={c.label} style={s.card(c.color)}>
              <div style={{ fontSize: '0.72rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{c.label}</div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Users</h2>
              <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.2rem' }}>{realUsers.length} real · {allUsers.length} total</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email or company..."
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem 0.875rem', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '220px' }}
              />
              <button onClick={() => setShowAll(v => !v)} style={s.btn(showAll ? '#f59e0b' : '#555', showAll ? 'rgba(245,158,11,0.08)' : 'transparent')}>
                {showAll ? '⚠ Showing All (incl. test)' : '👁 Show Test Accounts'}
              </button>
            </div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            {displayUsers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>No users found</div>
            ) : displayUsers.map((u: any, i: number) => (
              <div key={u.id} style={{ borderBottom: i < displayUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* User info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{u.email}</span>
                      {!u.confirmed && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>UNCONFIRMED</span>}
                      {u.user_type === 'owner' && <span style={{ fontSize: '0.65rem', background: 'rgba(0,217,255,0.1)', color: '#00d9ff', border: '1px solid rgba(0,217,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>OWNER</span>}
                      {u.user_type === 'employee' && <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>EMPLOYEE</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>
                      {u.company_name && <span style={{ color: '#888', marginRight: '1rem' }}>🏢 {u.company_name}</span>}
                      <span>Joined {fmt(u.created_at)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Reset password */}
                    <button
                      onClick={() => doAction('reset_password', u.id, u.email)}
                      disabled={actionLoading === u.id + 'reset_password'}
                      style={s.btn('#f59e0b', 'rgba(245,158,11,0.08)')}
                    >
                      {actionLoading === u.id + 'reset_password' ? '...' : '🔑 Reset PW'}
                    </button>

                    {/* Confirm email */}
                    {!u.confirmed && (
                      <button
                        onClick={() => doAction('confirm_email', u.id, u.email)}
                        disabled={actionLoading === u.id + 'confirm_email'}
                        style={s.btn('#22c55e', 'rgba(34,197,94,0.08)')}
                      >
                        {actionLoading === u.id + 'confirm_email' ? '...' : '✉️ Confirm Email'}
                      </button>
                    )}

                    {/* Delete user */}
                    {confirmDelete === u.id ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => doAction('delete_user', u.id, u.email)}
                          disabled={!!actionLoading}
                          style={s.btn('#ef4444', 'rgba(239,68,68,0.15)')}
                        >
                          {actionLoading === u.id + 'delete_user' ? '...' : '⚠ Confirm Delete'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} style={s.btn('#555', 'transparent')}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(u.id)} style={s.btn('#ef4444', 'rgba(239,68,68,0.05)')}>
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback messages */}
                {actionMsg[u.id] && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: actionMsg[u.id].startsWith('❌') ? '#ef4444' : '#22c55e' }}>
                    {actionMsg[u.id]}
                  </div>
                )}

                {/* Reset link — copy/paste to send to user */}
                {resetLinks[u.id] && (
                  <div style={{ marginTop: '0.75rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700', marginBottom: '0.4rem' }}>PASSWORD RESET LINK — send this to {u.email}:</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ fontSize: '0.72rem', color: '#ccc', wordBreak: 'break-all', flex: 1 }}>{resetLinks[u.id]}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(resetLinks[u.id]); setActionMsg(m => ({ ...m, [u.id]: '✅ Link copied!' })) }}
                        style={s.btn('#f59e0b', 'rgba(245,158,11,0.12)')}
                      >📋 Copy</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: '800' }}>Companies</h2>
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            {!data?.companies?.length ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>No companies yet</div>
            ) : data.companies.map((c: any, i: number) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: i < data.companies.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '0.2rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#555' }}>Owner: {c.owner_email || '—'} · {fmt(c.created_at)}</div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#00d9ff', fontWeight: '700' }}>{c.employee_count} employee{c.employee_count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
