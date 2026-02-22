'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { generateW2CSV, downloadCSV } from '../../lib/export'
import { createEmployeeInvite } from '../../lib/invites'

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'payroll' | 'projects'>('overview')
  const [employees, setEmployees] = useState<any[]>([])
  const [payroll, setPayroll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      // Check for demo mode
      const isDemo = localStorage.getItem('demo_mode') === 'true'
      if (isDemo) {
        setUser({ id: 'demo', email: localStorage.getItem('user_email') || 'demo@timeclok.test' })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      await fetchDashboardData(user.id)
    }
    checkAuth()
  }, [])

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true)

      // Check for demo mode
      const isDemo = localStorage.getItem('demo_mode') === 'true'
      if (isDemo) {
        // Mock demo data
        setEmployees([
          {
            id: '1',
            user_id: 'emp1',
            hourly_rate: 25,
            users: { email: 'john@example.com', full_name: 'John Doe' }
          },
          {
            id: '2',
            user_id: 'emp2',
            hourly_rate: 30,
            users: { email: 'jane@example.com', full_name: 'Jane Smith' }
          }
        ])
        setPayroll([
          {
            id: 'pay1',
            total_amount: 600,
            status: 'pending',
            employees: { users: { full_name: 'John Doe' } }
          },
          {
            id: 'pay2',
            total_amount: 720,
            status: 'approved',
            employees: { users: { full_name: 'Jane Smith' } }
          }
        ])
        setLoading(false)
        return
      }
      
      // Fetch company data
      const { data: companyData, error: compError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .single()
      
      if (compError && compError.code !== 'PGRST116') throw compError
      
      const companyId = companyData?.id || userId
      
      // Fetch employees for this owner's company
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('*, users(email, full_name)')
        .eq('company_id', companyId)
      
      if (empError) throw empError

      // Fetch payroll records
      const { data: payrollData, error: payError } = await supabase
        .from('payroll')
        .select('*, employees(users(full_name))')
        .order('created_at', { ascending: false })
      
      if (payError) throw payError

      setEmployees(employeesData || [])
      setPayroll(payrollData || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprovePayroll = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll')
        .update({ status: 'approved' })
        .eq('id', payrollId)
      
      if (error) throw error
      await fetchDashboardData(user.id)
    } catch (err: any) {
      setError(err.message || 'Failed to approve payroll')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setInviteLoading(true)
    setError('')
    setInviteSuccess('')

    try {
      const result = await createEmployeeInvite(user.id, inviteEmail, user.email || 'Admin')
      if (result.error) throw new Error(result.error)

      setInviteUrl(result.inviteUrl)
      setInviteSuccess(`Invite link created! Share this with your employee:\n\n${result.inviteUrl}`)
      setInviteEmail('')
    } catch (err: any) {
      setError(err.message || 'Failed to create invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const totalPayroll = payroll
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <div>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(10, 10, 10, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem 2rem',
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ TimeClok Owner</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#999', fontSize: '0.875rem' }}>{user?.email}</span>
            <button
              onClick={handleLogout}
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ marginTop: '80px', padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {error && <div style={{ background: 'rgba(255, 0, 110, 0.2)', color: '#ff006e', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>{error}</div>}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '1rem',
          }}>
            {(['overview', 'employees', 'payroll', 'projects'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: activeTab === tab ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                  border: activeTab === tab ? '2px solid #00d9ff' : '2px solid transparent',
                  color: activeTab === tab ? '#00d9ff' : '#999',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              marginBottom: '2rem',
            }}>
              <div style={{
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                padding: '2rem',
                borderRadius: '1rem',
              }}>
                <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>Active Employees</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{employees.length}</div>
              </div>
              <div style={{
                background: 'rgba(255, 221, 0, 0.1)',
                border: '1px solid rgba(255, 221, 0, 0.3)',
                padding: '2rem',
                borderRadius: '1rem',
              }}>
                <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>Pending Payroll</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${totalPayroll.toFixed(2)}</div>
              </div>
              <div style={{
                background: 'rgba(255, 0, 110, 0.1)',
                border: '1px solid rgba(255, 0, 110, 0.3)',
                padding: '2rem',
                borderRadius: '1rem',
              }}>
                <div style={{ fontSize: '0.875rem', color: '#ff006e', marginBottom: '0.5rem' }}>Pending Approvals</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{payroll.filter(p => p.status === 'pending').length}</div>
              </div>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Your Employees</h2>
                <button
                  onClick={() => { setShowInviteModal(true); setInviteSuccess(''); setInviteUrl('') }}
                  style={{
                    background: '#00d9ff',
                    color: '#000',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Add Employee
                </button>
              </div>

              {/* Invite Modal */}
              {showInviteModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                }}>
                  <div style={{
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    maxWidth: '500px',
                    width: '90%',
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                      Invite Employee
                    </h3>

                    {inviteSuccess ? (
                      <div style={{
                        background: 'rgba(100, 200, 100, 0.1)',
                        border: '1px solid rgba(100, 200, 100, 0.3)',
                        color: '#64c864',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '0.875rem',
                      }}>
                        {inviteSuccess}
                      </div>
                    ) : (
                      <>
                        <input
                          type="email"
                          placeholder="employee@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            marginBottom: '1.5rem',
                            boxSizing: 'border-box',
                          }}
                        />
                        {error && (
                          <div style={{
                            background: 'rgba(255, 0, 110, 0.2)',
                            color: '#ff006e',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                          }}>
                            {error}
                          </div>
                        )}
                        <button
                          onClick={handleSendInvite}
                          disabled={inviteLoading}
                          style={{
                            width: '100%',
                            background: '#00d9ff',
                            color: '#000',
                            border: 'none',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: inviteLoading ? 'not-allowed' : 'pointer',
                            opacity: inviteLoading ? 0.6 : 1,
                            marginBottom: '0.5rem',
                          }}
                        >
                          {inviteLoading ? 'Creating Invite...' : 'Create Invite Link'}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setShowInviteModal(false)
                        setInviteEmail('')
                        setInviteSuccess('')
                      }}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        color: '#999',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {employees.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No employees yet. Click "Add Employee" above to invite your first employee.</div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Name</div>
                          <div style={{ fontWeight: '600' }}>{emp.users?.full_name || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Hourly Rate</div>
                          <div style={{ fontWeight: '600' }}>${emp.hourly_rate?.toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Type</div>
                          <div style={{ fontWeight: '600' }}>{emp.employee_type || 'Employee'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Payroll Management</h2>
                <button
                  onClick={() => {
                    const csv = 'Employee,Hours,Rate,Total,Status\n' + 
                      payroll.map(p => 
                        `${p.employees?.users?.full_name || 'Unknown'},${p.total_hours || 0},$${p.hourly_rate || 0},$${p.total_amount?.toFixed(2) || 0},${p.status}`
                      ).join('\n')
                    downloadCSV(csv, `payroll-export-${new Date().toISOString().split('T')[0]}.csv`)
                  }}
                  style={{
                    background: '#ffdd00',
                    color: '#000',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  📋 Export Payroll
                </button>
              </div>
              {payroll.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No payroll records yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {payroll.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        background: record.status === 'pending' ? 'rgba(255, 221, 0, 0.05)' : 'rgba(0, 217, 255, 0.05)',
                        border: record.status === 'pending' ? '1px solid rgba(255, 221, 0, 0.2)' : '1px solid rgba(0, 217, 255, 0.2)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 150px', gap: '2rem', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Employee</div>
                          <div style={{ fontWeight: '600' }}>{record.employees?.users?.full_name || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Hours</div>
                          <div style={{ fontWeight: '600' }}>{record.total_hours || 0} hrs</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Amount</div>
                          <div style={{ fontWeight: '600', fontSize: '1.25rem' }}>${record.total_amount?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Status</div>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: record.status === 'pending' ? 'rgba(255, 221, 0, 0.2)' : record.status === 'approved' ? 'rgba(0, 217, 255, 0.2)' : 'rgba(100, 200, 100, 0.2)',
                            color: record.status === 'pending' ? '#ffdd00' : record.status === 'approved' ? '#00d9ff' : '#64c864',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                          }}>
                            {record.status}
                          </div>
                        </div>
                        <div>
                          {record.status === 'pending' && (
                            <button
                              onClick={() => handleApprovePayroll(record.id)}
                              style={{
                                background: '#00d9ff',
                                color: '#000',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                              }}
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Projects</h2>
              <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Project management coming soon.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
