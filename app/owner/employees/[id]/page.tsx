'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

const SUPABASE_URL = 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function workingSince(startDate: string | null | undefined): string {
  if (!startDate) return '—'
  const start = new Date(startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return `${years}y ${rem}m`
}

function maskTaxId(taxId: string | null | undefined): string {
  if (!taxId) return '—'
  if (taxId.length <= 4) return taxId
  return `***-**-${taxId.slice(-4)}`
}

export default function EmployeeProfilePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string

  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentEntries, setRecentEntries] = useState<any[]>([])

  const [editing, setEditing] = useState(false)
  const [taxRevealed, setTaxRevealed] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  // Edit form state
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }

    const res = await fetch(`/api/owner/employees/${employeeId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to load employee')
      setLoading(false)
      return
    }

    const data = await res.json()
    setProfile(data.employee)
    setStats(data.stats)
    setRecentEntries(data.recentEntries || [])
    setEditForm({
      position: data.employee.position || '',
      phone: data.employee.phone || '',
      address: data.employee.address || '',
      notes: data.employee.notes || '',
      tax_id: data.employee.tax_id || '',
      start_date: data.employee.start_date || '',
      hourly_rate: data.employee.hourly_rate || '',
      employee_type: data.employee.employee_type || 'w2',
      avatar_url: data.employee.avatar_url || '',
    })
    setLoading(false)
  }, [employeeId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSaving(true)
    setError('')

    const res = await fetch(`/api/owner/employees/${employeeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(editForm),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Save failed')
    } else {
      setProfile(data.employee)
      setEditing(false)
      setSuccessMsg('Profile saved!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Upload to Supabase Storage
      const fileName = `${employeeId}-${Date.now()}.${file.name.split('.').pop()}`

      // Try to create bucket if it doesn't exist (ignore errors)
      await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'employee-avatars', name: 'employee-avatars', public: true }),
      })

      // Upload file
      const formData = new FormData()
      formData.append('', file)

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/employee-avatars/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
          body: formData,
        }
      )

      if (!uploadRes.ok) {
        const errData = await uploadRes.json()
        throw new Error(errData.message || 'Upload failed')
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/employee-avatars/${fileName}`

      // Save URL to employee record
      const patchRes = await fetch(`/api/owner/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })

      if (patchRes.ok) {
        const data = await patchRes.json()
        setProfile(data.employee)
        setEditForm((prev: any) => ({ ...prev, avatar_url: publicUrl }))
        setSuccessMsg('Avatar updated!')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDelete = async () => {
    const empName = profile?.users?.full_name || profile?.users?.email?.split('@')[0] || 'Employee'
    if (deleteConfirmText.trim().toLowerCase() !== empName.toLowerCase()) return
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/owner/employees/${employeeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    setDeleting(false)
    if (json.success) {
      setDeleteMsg(json.message)
      setTimeout(() => router.push('/owner/dashboard'), 3000)
    } else {
      setError(json.error || 'Delete failed')
      setShowDeleteConfirm(false)
    }
  }

  const empName = profile?.users?.full_name || profile?.users?.email?.split('@')[0] || 'Employee'
  const empInitial = empName[0]?.toUpperCase() || '?'
  const gradient = getGradient(employeeId)

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0.6rem 0.875rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#555',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.35rem',
    display: 'block',
  }

  const fieldBox: React.CSSProperties = {
    marginBottom: '1.25rem',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👤</div>
          <div style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING PROFILE</div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>
          <button onClick={() => router.push('/owner/dashboard')} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' } as React.CSSProperties}>
      {/* Header */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button
          onClick={() => router.push('/owner/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#999', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
        >
          ← Employees
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {successMsg && (
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '600' }}>✓ {successMsg}</span>
          )}
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setError('') }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#666', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.8rem', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : '✓ Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.25)', color: '#00d9ff', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
            >
              ✎ Edit
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2.5rem 2rem' }}>
        {/* Error banner */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Profile Hero */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: isMobile ? '1.5rem' : '2.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: '2rem' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: isMobile ? '90px' : '110px', height: isMobile ? '90px' : '110px', borderRadius: '50%', background: profile?.avatar_url ? 'transparent' : gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '900', color: '#fff', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } as React.CSSProperties}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={empName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : empInitial}
            </div>
            {/* Upload button */}
            <label style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', border: '2px solid #0f0f0f' } as React.CSSProperties}>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
              {uploadingAvatar ? '⏳' : '📷'}
            </label>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>{empName}</h1>
              {profile?.position && (
                <span style={{ background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.25)', color: '#00d9ff', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700' }}>
                  {profile.position}
                </span>
              )}
            </div>
            <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{profile?.users?.email || '—'}</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rate</span>
                <span style={{ color: '#00d9ff', fontWeight: '800', fontSize: '0.95rem' }}>${profile?.hourly_rate?.toFixed(2)}/hr</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</span>
                <span style={{ background: profile?.employee_type === 'w2' ? 'rgba(167,139,250,0.12)' : 'rgba(244,114,182,0.12)', color: profile?.employee_type === 'w2' ? '#a78bfa' : '#f472b6', padding: '0.15rem 0.5rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700' }}>
                  {(profile?.employee_type || 'w2').toUpperCase()}
                </span>
              </div>
              {profile?.start_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Since</span>
                  <span style={{ color: '#888', fontSize: '0.875rem' }}>{workingSince(profile.start_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Hours', value: `${stats?.totalHours ?? 0}h`, icon: '⏱', color: '#00d9ff' },
            { label: 'Total Earned', value: `$${(stats?.totalEarned ?? 0).toFixed(0)}`, icon: '💵', color: '#22c55e' },
            { label: 'Time Entries', value: stats?.entriesCount ?? 0, icon: '📋', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Details */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Left: Contact Info */}
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' }}>Contact & Details</h3>

            {editing ? (
              <>
                <div style={fieldBox}>
                  <label style={labelStyle}>Position</label>
                  <input style={inputStyle} value={editForm.position} onChange={e => setEditForm((p: any) => ({ ...p, position: e.target.value }))} placeholder="e.g. Cashier, Manager" />
                </div>
                <div style={fieldBox}>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={editForm.phone} onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} placeholder="+1 555-000-0000" />
                </div>
                <div style={fieldBox}>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} value={editForm.address} onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City, State" />
                </div>
                <div style={fieldBox}>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" style={inputStyle} value={editForm.start_date} onChange={e => setEditForm((p: any) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div style={fieldBox}>
                  <label style={labelStyle}>Hourly Rate ($)</label>
                  <input type="number" step="0.01" style={inputStyle} value={editForm.hourly_rate} onChange={e => setEditForm((p: any) => ({ ...p, hourly_rate: parseFloat(e.target.value) }))} />
                </div>
                <div style={fieldBox}>
                  <label style={labelStyle}>Employee Type</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={editForm.employee_type} onChange={e => setEditForm((p: any) => ({ ...p, employee_type: e.target.value }))}>
                    <option value="w2">W2</option>
                    <option value="1099">1099</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                {[
                  { label: 'Position', value: profile?.position || '—' },
                  { label: 'Phone', value: profile?.phone || '—' },
                  { label: 'Address', value: profile?.address || '—' },
                  { label: 'Start Date', value: profile?.start_date ? formatDate(profile.start_date) : '—' },
                  { label: 'Hourly Rate', value: `$${profile?.hourly_rate?.toFixed(2) || '0.00'}/hr` },
                  { label: 'Employee Type', value: (profile?.employee_type || 'w2').toUpperCase() },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: '0.875rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{f.label}</div>
                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{f.value}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right: Tax & Notes */}
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' }}>Tax & Internal Notes</h3>

            {/* Tax ID */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Tax ID (SSN / EIN)</div>
              {editing ? (
                <input
                  style={inputStyle}
                  value={editForm.tax_id}
                  onChange={e => setEditForm((p: any) => ({ ...p, tax_id: e.target.value }))}
                  placeholder="XXX-XX-XXXX"
                  type="text"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#ccc', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                    {taxRevealed ? (profile?.tax_id || '—') : maskTaxId(profile?.tax_id)}
                  </span>
                  {profile?.tax_id && (
                    <button
                      onClick={() => setTaxRevealed(r => !r)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', padding: '0.2rem 0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      title={taxRevealed ? 'Hide' : 'Reveal'}
                    >
                      {taxRevealed ? '🙈' : '👁'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Internal notes */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Internal Notes</div>
              {editing ? (
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm((p: any) => ({ ...p, notes: e.target.value }))}
                  placeholder="Private notes about this employee..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              ) : (
                <div style={{ fontSize: '0.875rem', color: profile?.notes ? '#aaa' : '#444', fontStyle: profile?.notes ? 'normal' : 'italic', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '0.875rem', minHeight: '80px' }}>
                  {profile?.notes || 'No notes yet'}
                </div>
              )}
            </div>

            {/* Working since */}
            {profile?.start_date && (
              <div style={{ background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.1)', borderRadius: '10px', padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🗓</span>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Working Since</div>
                  <div style={{ fontWeight: '800', color: '#00d9ff', fontSize: '1rem', marginTop: '0.1rem' }}>{workingSince(profile.start_date)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontWeight: '800', fontSize: '1rem' }}>Recent Time Entries</div>
            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Last 5 clock-in/out records</div>
          </div>
          {recentEntries.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#444' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏰</div>
              No time entries yet
            </div>
          ) : (
            recentEntries.map((entry: any, i: number) => (
              <div
                key={entry.id}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.5rem', borderBottom: i < recentEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', flexWrap: isMobile ? 'wrap' : 'nowrap' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.clock_out ? '#555' : '#22c55e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                    {formatDate(entry.clock_in)} · {formatTime(entry.clock_in)} → {entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: '#22c55e', fontWeight: '700' }}>Still Clocked In</span>}
                  </div>
                  {entry.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#555', fontStyle: 'italic', marginTop: '0.2rem' }}>"{entry.notes}"</div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#00d9ff', flexShrink: 0 }}>
                  {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '—'}
                </div>
                {entry.approval_status && (
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', color: entry.approval_status === 'approved' ? '#22c55e' : entry.approval_status === 'pending' ? '#f59e0b' : '#888', background: entry.approval_status === 'approved' ? 'rgba(34,197,94,0.1)' : entry.approval_status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    {entry.approval_status}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Employee Button */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 1.25rem 3rem' }}>
        <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(239,68,68,0.12)' }}
            onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(239,68,68,0.06)' }}
          >
            🗑 Remove Employee
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '100%' }}>
            {deleteMsg ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#22c55e', marginBottom: '0.5rem' }}>Employee Removed</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>{deleteMsg}</div>
                <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '0.5rem' }}>Redirecting to dashboard...</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>Remove {empName}?</h3>
                <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#666', textAlign: 'center', lineHeight: 1.6 }}>
                  This will permanently delete their profile, time entries, and payroll records. A final report will be emailed to you for record keeping.
                </p>
                <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem' }}>
                    Type <strong style={{ color: '#ef4444' }}>{empName}</strong> to confirm:
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={empName}
                    autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none' } as React.CSSProperties}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmText.trim().toLowerCase() !== empName.toLowerCase()}
                    style={{ flex: 1, padding: '0.75rem', background: deleteConfirmText.trim().toLowerCase() === empName.toLowerCase() ? '#ef4444' : 'rgba(239,68,68,0.2)', border: 'none', color: deleteConfirmText.trim().toLowerCase() === empName.toLowerCase() ? '#fff' : '#555', borderRadius: '10px', cursor: deleteConfirmText.trim().toLowerCase() === empName.toLowerCase() ? 'pointer' : 'not-allowed', fontWeight: '800', fontSize: '0.9rem', transition: 'all 0.2s' }}
                  >
                    {deleting ? 'Removing...' : '🗑 Remove'}
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
