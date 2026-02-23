'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'

export default function PayrollPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const t = useTranslation(lang)
  
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [payroll, setPayroll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid'>('pending')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await fetchPayroll(user.id)
    }
    checkAuth()
  }, [])

  const fetchPayroll = async (userId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userData?.company_id) {
        const { data: payrollData } = await supabase
          .from('payroll')
          .select('*, employees(hourly_rate, user_id)')
          .eq('employee_id', (await supabase
            .from('employees')
            .select('id')
            .eq('company_id', userData.company_id)).data?.[0]?.id)
          .order('created_at', { ascending: false })

        setPayroll(payrollData || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprovePayroll = async (payrollId: string) => {
    try {
      setError('')
      const { error: err } = await supabase
        .from('payroll')
        .update({ 
          status: 'approved',
          supervisor_id: user.id,
        })
        .eq('id', payrollId)

      if (err) throw err

      setSuccessMessage('Payroll approved!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Refresh
      await fetchPayroll(user.id)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handlePayPayroll = async (payrollId: string) => {
    try {
      setError('')
      const { error: err } = await supabase
        .from('payroll')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', payrollId)

      if (err) throw err

      setSuccessMessage('Payment processed!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Refresh
      await fetchPayroll(user.id)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleExport = async () => {
    try {
      const filteredPayroll = filterStatus === 'all' 
        ? payroll 
        : payroll.filter(p => p.status === filterStatus)

      const csv = [
        ['Date', 'Employee', 'Hours', 'Rate', 'Amount', 'Status'].join(','),
        ...filteredPayroll.map(p => [
          new Date(p.created_at).toLocaleDateString(),
          p.employees?.user_id || 'Unknown',
          p.total_hours || 0,
          '$' + (p.hourly_rate || 0).toFixed(2),
          '$' + (p.total_amount || 0).toFixed(2),
          p.status,
        ].join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredPayroll = filterStatus === 'all' 
    ? payroll 
    : payroll.filter(p => p.status === filterStatus)

  const totalPending = payroll
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0)

  const totalApproved = payroll
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0)

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
      }}>
        Loading...
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ {t.ownerDashboard}</h1>
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
            onClick={() => router.push('/owner/employees')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 217, 255, 0.5)',
              color: '#00d9ff',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {t.employees}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>{t.payroll}</h2>

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
            {successMessage}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            background: 'rgba(255, 221, 0, 0.1)',
            border: '1px solid rgba(255, 221, 0, 0.3)',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>
              Pending Approval
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900' }}>
              ${totalPending.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>
              Ready to Pay
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900' }}>
              ${totalApproved.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters & Export */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['pending', 'approved', 'paid', 'all'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '0.5rem 1rem',
                  background: filterStatus === status ? '#00d9ff' : 'rgba(255,255,255,0.1)',
                  color: filterStatus === status ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 221, 0, 0.2)',
              border: '1px solid rgba(255, 221, 0, 0.5)',
              color: '#ffdd00',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            📥 {t.export}
          </button>
        </div>

        {/* Payroll Table */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Employee</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Hours</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No payroll records
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      {p.employees?.user_id || 'Unknown Employee'}
                    </td>
                    <td style={{ padding: '1rem' }}>{(p.total_hours || 0).toFixed(1)}</td>
                    <td style={{ padding: '1rem' }}>${(p.total_amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        background: p.status === 'pending' ? 'rgba(255, 221, 0, 0.2)' :
                                  p.status === 'approved' ? 'rgba(0, 217, 255, 0.2)' :
                                  'rgba(0, 255, 136, 0.2)',
                        color: p.status === 'pending' ? '#ffdd00' :
                               p.status === 'approved' ? '#00d9ff' :
                               '#00ff88',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleApprovePayroll(p.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: 'rgba(0, 217, 255, 0.2)',
                            border: '1px solid rgba(0, 217, 255, 0.5)',
                            color: '#00d9ff',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                          }}
                        >
                          Approve
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <button
                          onClick={() => handlePayPayroll(p.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: 'rgba(0, 255, 136, 0.2)',
                            border: '1px solid rgba(0, 255, 136, 0.5)',
                            color: '#00ff88',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                          }}
                        >
                          Pay
                        </button>
                      )}
                      {p.status === 'paid' && (
                        <span style={{ fontSize: '0.875rem', color: '#999' }}>
                          ✓ Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
