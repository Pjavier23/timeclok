'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useLang } from '../../contexts/LanguageContext'

export default function EmployeeProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLang()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [last4SSN, setLast4SSN] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [token, setToken] = useState('')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }
    setToken(session.access_token)
    const res = await fetch('/api/employee/data', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const json = await res.json()
    setData(json)
    setAddress(json.employee?.address || '')
    setPhone(json.employee?.phone || '')
    // Show last 4 if already on file (format ***-**-XXXX)
    const stored = json.employee?.tax_id || ''
    setLast4SSN(stored ? stored.replace(/\D/g, '').slice(-4) : '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    const body: Record<string, string> = { address, phone }
    if (last4SSN.length === 4) body.tax_id = last4SSN
    await fetch('/api/employee/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !data?.employee?.id) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${data.employee.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatar_url = urlData.publicUrl
      await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_url }),
      })
      setData((prev: any) => ({ ...prev, employee: { ...prev.employee, avatar_url } }))
    }
    setUploadingAvatar(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'system-ui, sans-serif' }}>
      Loading...
    </div>
  )

  const emp = data?.employee || {}
  const user = data?.user || {}
  const company = data?.company || {}
  const initials = (user.full_name || user.email || 'U')[0].toUpperCase()

  const readonlyField = (label: string, value: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{value || '—'}</span>
        <span style={{ fontSize: '0.68rem', color: '#444', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Read only</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#0c0c0c', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem', lineHeight: 1 }}>←</button>
          <a href="/employee/dashboard" style={{ fontSize: '1rem', fontWeight: '900', background: 'linear-gradient(135deg, #00d9ff, #0099cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' } as React.CSSProperties}>TimeClok</a>
        </div>
        <LanguageToggle />
      </header>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Avatar section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #00d9ff22, #0099cc22)', border: '2px solid rgba(0,217,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', fontWeight: '800', overflow: 'hidden' }}>
              {emp.avatar_url
                ? <img src={emp.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            {/* Upload button */}
            <label style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', border: '2px solid #0f0f0f' }}>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
              {uploadingAvatar ? '⏳' : '📷'}
            </label>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{user.full_name || '—'}</div>
          <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.2rem' }}>{company.name}</div>
          {emp.position && (
            <div style={{ marginTop: '0.5rem', background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', padding: '0.2rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700' }}>
              {emp.position}
            </div>
          )}
        </div>

        {/* Read-only fields */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '1.25rem' }}>Your Info</div>
          {readonlyField('Full Name', user.full_name)}
          {readonlyField('Email', user.email)}
          {readonlyField('Phone', emp.phone)}
          {readonlyField('Position', emp.position)}
          {readonlyField('Hourly Rate', emp.hourly_rate ? `$${Number(emp.hourly_rate).toFixed(2)}/hr` : '')}
          {readonlyField('Employee Type', emp.employee_type?.toUpperCase())}

          {/* Request change note */}
          <div style={{ marginTop: '0.5rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>💬</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.2rem' }}>Need to update your info?</div>
              <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>Contact your employer to update your name, phone, position, or pay rate.</div>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#00d9ff', marginBottom: '1.25rem' }}>✎ Editable by You</div>

          {/* Phone */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' } as React.CSSProperties}
              onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* Home Address */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Home Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, City, State, ZIP"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s' } as React.CSSProperties}
              onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* Last 4 SSN */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: '0.4rem' }}>Last 4 of Social Security #</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#444', letterSpacing: '0.15em' }}>***-**-</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={last4SSN}
                onChange={e => setLast4SSN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="XXXX"
                style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.875rem 1rem', color: '#fff', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.2em', outline: 'none', textAlign: 'center', transition: 'border-color 0.2s' } as React.CSSProperties}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '0.4rem' }}>Stored securely as ***-**-XXXX. Used for payroll records.</div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: saved ? '#22c55e' : '#00d9ff', color: '#000', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '800', fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Back to dashboard */}
        <button
          onClick={() => router.push('/employee/dashboard')}
          style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#555', borderRadius: '10px', padding: '0.875rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}
