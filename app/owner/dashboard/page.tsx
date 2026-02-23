'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadDashboardData(user.id)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboardData = async (userId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userData?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single()
        
        setCompany(companyData)

        const { data: employeesData } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', userData.company_id)
        
        setEmployees(employeesData || [])
      }
      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleInviteEmployee = async () => {
    if (!inviteEmail || !company) return
    
    setInviteLoading(true)
    try {
      const inviteToken = Math.random().toString(36).substring(2, 15)
      const inviteLink = `${window.location.origin}/join?token=${inviteToken}&company=${company.id}&email=${encodeURIComponent(inviteEmail)}`
      
      // In production, send this via email service
      console.log('Invite link:', inviteLink)
      
      // For now, show the link
      alert(`Share this link with the employee:\n\n${inviteLink}`)
      setInviteEmail('')
      setShowInviteModal(false)
      
      // Reload employees
      await loadDashboardData(user.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>Loading...</div>
  }

  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = currentTime.toLocaleTimeString('en-US')

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
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0 }}>⏱️ TimeClok</h1>
          {company && <p style={{ fontSize: '0.875rem', color: '#999', margin: '0.25rem 0 0 0' }}>{company.name}</p>}
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
          style={{
            background: 'rgba(255, 0, 110, 0.2)',
            border: '1px solid rgba(255, 0, 110, 0.5)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            color: '#ff006e',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
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

        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>Active Employees</div>
            <div style={{ fontSize: '3rem', fontWeight: '900' }}>{employees.length}</div>
          </div>

          <div style={{
            background: 'rgba(255, 221, 0, 0.1)',
            border: '1px solid rgba(255, 221, 0, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>Today</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{formattedDate}</div>
            <div style={{ fontSize: '1rem', color: '#ffdd00', marginTop: '0.5rem' }}>{formattedTime}</div>
          </div>

          <div style={{
            background: 'rgba(255, 0, 110, 0.1)',
            border: '1px solid rgba(255, 0, 110, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ff006e', marginBottom: '0.5rem' }}>Company</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{company?.name || 'Loading...'}</div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              background: '#00d9ff',
              color: '#000',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '1.125rem',
              cursor: 'pointer',
            }}
          >
            ➕ Add New Employee
          </button>
        </div>

        {/* Employees List */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>
            Employees ({employees.length})
          </div>
          
          {employees.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              No employees yet. Click "Add New Employee" to get started.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Hourly Rate</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{emp.email || 'Pending invite'}</td>
                    <td style={{ padding: '1rem' }}>${emp.hourly_rate?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '1rem' }}>{emp.employee_type || 'standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
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
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Add New Employee</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Employee Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employee@example.com"
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

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleInviteEmployee}
                disabled={inviteLoading || !inviteEmail}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#00d9ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: inviteLoading ? 0.6 : 1,
                }}
              >
                {inviteLoading ? 'Sending...' : 'Send Invite Link'}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
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
          </div>
        </div>
      )}
    </div>
  )
}
