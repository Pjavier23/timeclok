'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { 
  clockInEmailTemplate, 
  clockOutEmailTemplate, 
  sendEmailNotification 
} from '../../lib/email'
import { generateEarningsReport, downloadCSV } from '../../lib/export'

export default function EmployeeDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'clock' | 'earnings' | 'profile'>('clock')
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initDashboard = async () => {
      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }
        setUser(user)

        // Fetch employee profile
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (empError && empError.code !== 'PGRST116') throw empError
        setEmployee(empData || { hourly_rate: 25 })

        // Fetch time entries
        if (empData?.id) {
          const { data: entries, error: entError } = await supabase
            .from('time_entries')
            .select('*')
            .eq('employee_id', empData.id)
            .order('clock_in', { ascending: false })

          if (entError) throw entError
          setTimeEntries(entries || [])

          // Check if currently clocked in
          const active = entries?.find(e => !e.clock_out)
          if (active) {
            setIsClockedIn(true)
            setCurrentSession(active)
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [])

  const getLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          },
          () => {
            setError('Could not access location. Please enable GPS.')
            resolve(null)
          }
        )
      }
    })
  }

  const handleClockIn = async () => {
    try {
      setError('')
      const loc = await getLocation()
      if (!loc) return

      if (!employee?.id) throw new Error('Employee profile not found')

      const { data, error: err } = await supabase
        .from('time_entries')
        .insert([{
          employee_id: employee.id,
          clock_in: new Date().toISOString(),
          latitude: loc.lat,
          longitude: loc.lng,
          approval_status: 'pending',
        }])
        .select()
        .single()

      if (err) throw err

      setCurrentSession(data)
      setIsClockedIn(true)
      setLocation(loc)
    } catch (err: any) {
      setError(err.message || 'Failed to clock in')
    }
  }

  const handleClockOut = async () => {
    try {
      setError('')
      if (!currentSession?.id) throw new Error('No active session')

      const clockInTime = new Date(currentSession.clock_in)
      const clockOutTime = new Date()
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

      const { error: err } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          hours_worked: parseFloat(hoursWorked.toFixed(2)),
        })
        .eq('id', currentSession.id)

      if (err) throw err

      setIsClockedIn(false)
      setCurrentSession(null)

      // Refresh entries
      const { data: entries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('clock_in', { ascending: false })

      setTimeEntries(entries || [])
    } catch (err: any) {
      setError(err.message || 'Failed to clock out')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const totalHours = timeEntries
    .filter(e => e.hours_worked)
    .reduce((sum, e) => sum + (e.hours_worked || 0), 0)
  const totalEarned = (totalHours * (employee?.hourly_rate || 0)).toFixed(2)

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ TimeClok</h1>
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
            {(['clock', 'earnings', 'profile'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: activeTab === tab ? 'rgba(255, 0, 110, 0.1)' : 'transparent',
                  border: activeTab === tab ? '2px solid #ff006e' : '2px solid transparent',
                  color: activeTab === tab ? '#ff006e' : '#999',
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

          {/* Clock In/Out Tab */}
          {activeTab === 'clock' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Time Tracking</h2>

              {/* Clock Status */}
              <div style={{
                background: isClockedIn ? 'rgba(100, 200, 100, 0.1)' : 'rgba(255, 100, 100, 0.1)',
                border: isClockedIn ? '2px solid rgba(100, 200, 100, 0.3)' : '2px solid rgba(255, 100, 100, 0.3)',
                padding: '2rem',
                borderRadius: '1rem',
                textAlign: 'center',
                marginBottom: '2rem',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {isClockedIn ? '🟢' : '🔴'}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                </div>
                {isClockedIn && currentSession && (
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Since {new Date(currentSession.clock_in).toLocaleTimeString()}
                  </div>
                )}
                {location && (
                  <div style={{ color: '#999', fontSize: '0.75rem', marginTop: '1rem' }}>
                    📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                )}
              </div>

              {/* Clock Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
                <button
                  onClick={handleClockIn}
                  disabled={isClockedIn}
                  style={{
                    background: isClockedIn ? 'rgba(0, 217, 255, 0.2)' : '#00d9ff',
                    color: isClockedIn ? '#999' : '#000',
                    border: 'none',
                    padding: '2rem',
                    borderRadius: '1rem',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: isClockedIn ? 'not-allowed' : 'pointer',
                    opacity: isClockedIn ? 0.5 : 1,
                  }}
                >
                  Clock In
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={!isClockedIn}
                  style={{
                    background: !isClockedIn ? 'rgba(255, 0, 110, 0.2)' : '#ff006e',
                    color: !isClockedIn ? '#999' : '#fff',
                    border: 'none',
                    padding: '2rem',
                    borderRadius: '1rem',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: !isClockedIn ? 'not-allowed' : 'pointer',
                    opacity: !isClockedIn ? 0.5 : 1,
                  }}
                >
                  Clock Out
                </button>
              </div>

              {/* Time Entries */}
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Recent Time Entries</h3>
              {timeEntries.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No time entries yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {timeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Date</div>
                          <div style={{ fontWeight: '600' }}>
                            {new Date(entry.clock_in).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Clock In</div>
                          <div style={{ fontWeight: '600' }}>
                            {new Date(entry.clock_in).toLocaleTimeString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Clock Out</div>
                          <div style={{ fontWeight: '600' }}>
                            {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Hours</div>
                          <div style={{ fontWeight: '600' }}>{entry.hours_worked?.toFixed(2) || '—'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Your Earnings</h2>
                <button
                  onClick={() => {
                    const report = generateEarningsReport(user?.email || 'Employee', timeEntries, employee?.hourly_rate || 0)
                    downloadCSV(report, `earnings-report-${new Date().toISOString().split('T')[0]}.csv`)
                  }}
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
                  📥 Export Report
                </button>
              </div>

              {/* Stats */}
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
                  <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>Total Hours</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{totalHours.toFixed(1)}</div>
                </div>
                <div style={{
                  background: 'rgba(255, 221, 0, 0.1)',
                  border: '1px solid rgba(255, 221, 0, 0.3)',
                  padding: '2rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>Hourly Rate</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${employee?.hourly_rate?.toFixed(2) || '0.00'}</div>
                </div>
                <div style={{
                  background: 'rgba(100, 200, 100, 0.1)',
                  border: '1px solid rgba(100, 200, 100, 0.3)',
                  padding: '2rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#64c864', marginBottom: '0.5rem' }}>Total Earned</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${totalEarned}</div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Your Profile</h2>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                borderRadius: '1rem',
                maxWidth: '600px',
              }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Email</div>
                    <div style={{ fontWeight: '600' }}>{user?.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Hourly Rate</div>
                    <div style={{ fontWeight: '600' }}>${employee?.hourly_rate?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>Employee Type</div>
                    <div style={{ fontWeight: '600' }}>{employee?.employee_type || 'Employee'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
