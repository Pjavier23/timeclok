'use client'

import { useState, useEffect } from 'react'
import { Language, getTranslation } from '@/app/i18n'

export default function EmployeeDashboard() {
  const [lang, setLang] = useState<Language>('en')
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [runningSeconds, setRunningSeconds] = useState(0)
  const [activeTab, setActiveTab] = useState<'clock' | 'earnings' | 'profile' | 'payment'>('clock')
  const [showProfile, setShowProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: 'John Martinez',
    email: 'john@example.com',
    address: '123 Main St, Los Angeles, CA 90001',
    itin: '***-**-7890',
    startDate: '2024-01-15',
    hourlyRate: 25,
    photoUrl: '👨‍💼',
  })

  const t = (key: string) => getTranslation(lang, key as any)

  // Running timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isClockedIn) {
      interval = setInterval(() => {
        setRunningSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isClockedIn])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const mockTimeEntries = [
    { date: 'Feb 23, 2026', clockIn: '9:00 AM', clockOut: '5:30 PM', hours: 8.5 },
    { date: 'Feb 22, 2026', clockIn: '9:15 AM', clockOut: '6:00 PM', hours: 8.75 },
    { date: 'Feb 21, 2026', clockIn: '8:45 AM', clockOut: '5:15 PM', hours: 8.5 },
  ]

  const totalHours = mockTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const totalEarned = (totalHours * profileData.hourlyRate).toFixed(2)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
    }}>
      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '2rem',
        display: 'flex',
        gap: '0.5rem',
      }}>
        <button
          onClick={() => setLang('en')}
          style={{
            padding: '0.5rem 1rem',
            background: lang === 'en' ? '#ff006e' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          EN
        </button>
        <button
          onClick={() => setLang('es')}
          style={{
            padding: '0.5rem 1rem',
            background: lang === 'es' ? '#ff006e' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          ES
        </button>
      </div>

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
            <button
              onClick={() => setShowProfile(!showProfile)}
              style={{
                background: '#ff006e',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              👤 {profileData.name}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ marginTop: '80px', padding: '2rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '1rem',
          }}>
            {(['clock', 'earnings', 'profile', 'payment'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: activeTab === tab ? '#ff006e' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {tab === 'clock' && '⏱️'}
                {tab === 'earnings' && '💰'}
                {tab === 'profile' && '👤'}
                {tab === 'payment' && '💳'}
              </button>
            ))}
          </div>

          {/* Clock In/Out */}
          {activeTab === 'clock' && (
            <div>
              <div style={{
                background: isClockedIn ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 217, 255, 0.05))' : 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(255, 0, 110, 0.05))',
                border: isClockedIn ? '2px solid #1dd1dd' : '2px solid #ff006e',
                padding: '3rem 2rem',
                borderRadius: '1rem',
                textAlign: 'center',
                marginBottom: '2rem',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                  {isClockedIn ? '🟢' : '🔴'}
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  {isClockedIn ? t('clockedIn') : t('clockedOut')}
                </h2>
                
                {/* Running Timer */}
                <div style={{
                  fontSize: '3.5rem',
                  fontWeight: '900',
                  color: isClockedIn ? '#1dd1dd' : '#ff006e',
                  marginBottom: '1.5rem',
                  fontFamily: 'monospace',
                }}>
                  {formatTime(runningSeconds)}
                </div>

                <button
                  onClick={() => {
                    setIsClockedIn(!isClockedIn)
                    if (!isClockedIn) setRunningSeconds(0)
                  }}
                  style={{
                    background: isClockedIn ? '#ff006e' : '#1dd1dd',
                    color: isClockedIn ? '#fff' : '#000',
                    padding: '1rem 3rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    cursor: 'pointer',
                  }}
                >
                  {isClockedIn ? t('clockOut') : t('clockIn')}
                </button>
              </div>
            </div>
          )}

          {/* Earnings */}
          {activeTab === 'earnings' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  background: 'rgba(29, 209, 221, 0.1)',
                  border: '1px solid #1dd1dd',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>{t('totalHours')}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1dd1dd' }}>
                    {totalHours}h
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 0, 110, 0.1)',
                  border: '1px solid #ff006e',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>{t('totalEarnings')}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ff006e' }}>
                    ${totalEarned}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile */}
          {activeTab === 'profile' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '2rem',
              borderRadius: '1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {profileData.photoUrl}
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {profileData.name}
              </h2>
              <p style={{ color: '#999', marginBottom: '2rem' }}>
                {profileData.email}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'left',
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {t('address')}
                  </div>
                  <div style={{ fontWeight: '600' }}>{profileData.address}</div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {t('itin')}
                  </div>
                  <div style={{ fontWeight: '600' }}>{profileData.itin}</div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {t('startDate')}
                  </div>
                  <div style={{ fontWeight: '600' }}>{profileData.startDate}</div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}>
                  <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {t('hourlyRate')}
                  </div>
                  <div style={{ fontWeight: '600' }}>${profileData.hourlyRate}/hr</div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          {activeTab === 'payment' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>
                {t('paymentMethod')}
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}>
                {/* Zelle */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2rem',
                  borderRadius: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {t('zelle')}
                  </h3>
                  <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                    Fast, secure bank transfers
                  </p>
                  <button style={{
                    width: '100%',
                    background: '#1dd1dd',
                    color: '#000',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}>
                    {lang === 'en' ? 'Add Account' : 'Agregar Cuenta'}
                  </button>
                </div>

                {/* Direct Deposit */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2rem',
                  borderRadius: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏦</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {t('directDeposit')}
                  </h3>
                  <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                    Automatic bank deposits
                  </p>
                  <button style={{
                    width: '100%',
                    background: '#1dd1dd',
                    color: '#000',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}>
                    {lang === 'en' ? 'Add Account' : 'Agregar Cuenta'}
                  </button>
                </div>

                {/* Check */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2rem',
                  borderRadius: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {t('check')}
                  </h3>
                  <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                    Mailed checks to your address
                  </p>
                  <button style={{
                    width: '100%',
                    background: '#1dd1dd',
                    color: '#000',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}>
                    {lang === 'en' ? 'Enable' : 'Habilitar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
