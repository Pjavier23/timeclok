'use client'

import { useState } from 'react'

export default function EmployeeDashboard() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'clock' | 'earnings' | 'profile'>('clock')

  // Mock employee data
  const employee = {
    name: 'John Martinez',
    role: 'Contractor',
    rate: 25,
    profileImage: '👨‍💼',
  }

  const mockTimeEntries = [
    { id: 1, date: 'Feb 23, 2026', clockIn: '9:00 AM', clockOut: '5:30 PM', hours: 8.5, project: 'Downtown Renovation' },
    { id: 2, date: 'Feb 22, 2026', clockIn: '9:15 AM', clockOut: '6:00 PM', hours: 8.75, project: 'Downtown Renovation' },
    { id: 3, date: 'Feb 21, 2026', clockIn: '8:45 AM', clockOut: '5:15 PM', hours: 8.5, project: 'Downtown Renovation' },
    { id: 4, date: 'Feb 20, 2026', clockIn: '9:30 AM', clockOut: '5:45 PM', hours: 8.25, project: 'Downtown Renovation' },
    { id: 5, date: 'Feb 19, 2026', clockIn: '9:00 AM', clockOut: '5:00 PM', hours: 8, project: 'Downtown Renovation' },
  ]

  const totalHours = mockTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const totalEarned = (totalHours * employee.rate).toFixed(2)

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.log('Location error:', error)
          alert('Location access denied. Please enable location services.')
        }
      )
    }
  }

  const handleClockIn = () => {
    getLocation()
    setIsClockedIn(true)
  }

  const handleClockOut = () => {
    setIsClockedIn(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
    }}>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>
            ⏱️ TimeClok
          </h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#999' }}>{employee.name}</span>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              color: '#fff',
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ marginTop: '80px', padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
                  background: activeTab === tab ? '#ff006e' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {tab === 'clock' && '⏱️ Clock In/Out'}
                {tab === 'earnings' && '💰 Earnings'}
                {tab === 'profile' && '👤 Profile'}
              </button>
            ))}
          </div>

          {/* Clock In/Out Tab */}
          {activeTab === 'clock' && (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(255, 0, 110, 0.05))',
                border: '2px solid #ff006e',
                padding: '3rem 2rem',
                borderRadius: '1rem',
                textAlign: 'center',
                marginBottom: '2rem',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                  {isClockedIn ? '🟢' : '🔴'}
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                </h2>
                <p style={{ color: '#bbb', marginBottom: '2rem' }}>
                  {isClockedIn ? 'Currently working' : 'No active time entry'}
                </p>

                {location && (
                  <p style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    📍 Location verified ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </p>
                )}

                <button
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  style={{
                    background: isClockedIn ? '#ff006e' : '#00ff00',
                    color: isClockedIn ? '#fff' : '#000',
                    padding: '1rem 3rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: 'pointer',
                  }}
                >
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </button>
              </div>

              {/* Time Entries */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                  Time Entries This Week
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {mockTimeEntries.map(entry => (
                    <div key={entry.id} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{entry.date}</div>
                        <div style={{ color: '#999', fontSize: '0.875rem' }}>
                          {entry.clockIn} - {entry.clockOut} ({entry.hours}h) • {entry.project}
                        </div>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '1.125rem', color: '#ff006e' }}>
                        ${(entry.hours * employee.rate).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 217, 255, 0.05))',
                  border: '1px solid #1dd1dd',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>Hours This Week</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1dd1dd' }}>
                    {totalHours}h
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(255, 0, 110, 0.05))',
                  border: '1px solid #ff006e',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>Earnings This Week</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ff006e' }}>
                    ${totalEarned}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                Breakdown
              </h3>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflowX: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700' }}>Date</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Hours</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Rate</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTimeEntries.map(entry => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem' }}>{entry.date}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{entry.hours}h</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${employee.rate}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', color: '#ff006e' }}>
                          ${(entry.hours * employee.rate).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                borderRadius: '1rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                  {employee.profileImage}
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {employee.name}
                </h2>
                <p style={{ color: '#999', marginBottom: '2rem' }}>
                  {employee.role} • ${employee.rate}/hr
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  marginBottom: '2rem',
                }}>
                  <div style={{
                    background: 'rgba(0, 217, 255, 0.1)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                  }}>
                    <div style={{ color: '#999', fontSize: '0.875rem' }}>All-Time Hours</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1dd1dd' }}>
                      156h
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 0, 110, 0.1)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                  }}>
                    <div style={{ color: '#999', fontSize: '0.875rem' }}>All-Time Earnings</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ff006e' }}>
                      $3,900
                    </div>
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                }}>
                  Edit Profile
                </button>

                <button style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid #ff006e',
                  color: '#ff006e',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  Download Tax Documents
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
