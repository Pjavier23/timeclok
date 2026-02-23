'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'

export default function EarningsPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const t = useTranslation(lang)
  
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initEmployee = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // Fetch employee profile
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setEmployee(empData || {})

        // Fetch time entries
        if (empData?.id) {
          const { data: entries } = await supabase
            .from('time_entries')
            .select('*')
            .eq('employee_id', empData.id)
            .order('clock_in', { ascending: false })

          setTimeEntries(entries || [])
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    initEmployee()
  }, [])

  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0)
  const totalEarnings = totalHours * (employee?.hourly_rate || 0)
  const hourlyRate = employee?.hourly_rate || 0

  const handleExport = () => {
    const csv = [
      ['Date', 'Clock In', 'Clock Out', 'Hours', 'Earnings'].join(','),
      ...timeEntries.map(e => [
        new Date(e.clock_in).toLocaleDateString(),
        new Date(e.clock_in).toLocaleTimeString(),
        e.clock_out ? new Date(e.clock_out).toLocaleTimeString() : 'N/A',
        (e.hours_worked || 0).toFixed(2),
        '$' + ((e.hours_worked || 0) * hourlyRate).toFixed(2),
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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
        {t.loadingDashboard}
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ {t.earnings}</h1>
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
            onClick={() => router.push('/employee/clock')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 217, 255, 0.5)',
              color: '#00d9ff',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {t.clockIn}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
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

        {/* Summary Cards */}
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
            <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>
              {t.totalEarnings}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: '900' }}>
              ${totalEarnings.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 221, 0, 0.1)',
            border: '1px solid rgba(255, 221, 0, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>
              {t.hoursWorked}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: '900' }}>
              {totalHours.toFixed(1)}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 0, 110, 0.1)',
            border: '1px solid rgba(255, 0, 110, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ff006e', marginBottom: '0.5rem' }}>
              {t.hourlyRate}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: '900' }}>
              ${hourlyRate.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 221, 0, 0.2)',
              border: '1px solid rgba(255, 221, 0, 0.5)',
              color: '#ffdd00',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            📥 {t.export} {t.earnings}
          </button>
        </div>

        {/* Time Entries Table */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Clock In</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Clock Out</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Hours</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No time entries yet
                  </td>
                </tr>
              ) : (
                timeEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      {new Date(e.clock_in).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(e.clock_in).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {e.clock_out ? new Date(e.clock_out).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {(e.hours_worked || 0).toFixed(2)}h
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#00d9ff' }}>
                      ${((e.hours_worked || 0) * hourlyRate).toFixed(2)}
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
