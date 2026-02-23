'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'

export default function EmployeesPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const t = useTranslation(lang)
  
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    hourlyRate: '25',
  })
  
  const [sendMethod, setSendMethod] = useState<'email' | 'sms'>('email')
  const [sending, setSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await fetchEmployees(user.id)
    }
    checkAuth()
  }, [])

  const fetchEmployees = async (userId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userData?.company_id) {
        const { data: emps } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', userData.company_id)

        setEmployees(emps || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    setSuccessMessage('')

    try {
      // Create invite link
      const inviteToken = Math.random().toString(36).substring(2, 15)
      const inviteLink = `${window.location.origin}/join?token=${inviteToken}&email=${encodeURIComponent(formData.email)}`

      // Send invite
      const sendRes = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: sendMethod,
          email: sendMethod === 'email' ? formData.email : undefined,
          phoneNumber: sendMethod === 'sms' ? formData.phoneNumber : undefined,
          inviteLink,
          companyName: user?.email?.split('@')[0] || 'Company',
        }),
      })

      if (!sendRes.ok) {
        throw new Error('Failed to send invite')
      }

      setSuccessMessage(
        sendMethod === 'email'
          ? `Invite sent to ${formData.email}`
          : `Invite sent to ${formData.phoneNumber}`
      )

      // Reset form
      setFormData({ email: '', phoneNumber: '', hourlyRate: '25' })
      setTimeout(() => {
        setShowAddModal(false)
        setSuccessMessage('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(10, 10, 10, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ TimeClok</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
          <button
            onClick={() => router.push('/owner/dashboard')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 217, 255, 0.5)',
              color: '#00d9ff',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {t.dashboard}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700' }}>{t.yourEmployees}</h2>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#00d9ff',
              color: '#000',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {t.addEmployee}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 0, 110, 0.2)',
            color: '#ff006e',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(0, 217, 255, 0.2)',
            color: '#00d9ff',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Employees List */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Hourly Rate</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No employees yet. Click "{t.addEmployee}" to get started.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{emp.email || 'Pending invite'}</td>
                    <td style={{ padding: '1rem' }}>${emp.hourly_rate?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '1rem' }}>{emp.employee_type || 'w2'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t.addEmployee}</h3>

              <form onSubmit={handleAddEmployee}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t.employeeEmail}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '0.5rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Hourly Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '0.5rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                    {t.sendViaEmail} / {t.sendViaSMS}
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSendMethod('email')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: sendMethod === 'email' ? '#00d9ff' : 'rgba(255,255,255,0.1)',
                        color: sendMethod === 'email' ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {t.sendViaEmail}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMethod('sms')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: sendMethod === 'sms' ? '#00d9ff' : 'rgba(255,255,255,0.1)',
                        color: sendMethod === 'sms' ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {t.sendViaSMS}
                    </button>
                  </div>
                </div>

                {sendMethod === 'sms' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t.phoneNumber}</label>
                    <input
                      type="tel"
                      required={sendMethod === 'sms'}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="+1234567890"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#00d9ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: sending ? 0.6 : 1,
                    }}
                  >
                    {sending ? 'Sending...' : t.sendInvite}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'transparent',
                      color: '#999',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
