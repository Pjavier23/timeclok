'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ClockPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [hoursWorked, setHoursWorked] = useState(0)

  useEffect(() => {
    const initEmployee = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setEmployee(empData || {})

        if (empData?.id) {
          const { data: entries } = await supabase
            .from('time_entries')
            .select('*')
            .eq('employee_id', empData.id)

          const active = entries?.find(e => !e.clock_out)
          if (active) {
            setIsClockedIn(true)
            setCurrentSession(active)
          }

          const totalHours = entries?.reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0
          const totalEarned = totalHours * (empData?.hourly_rate || 0)
          setHoursWorked(totalHours)
          setTotalEarnings(totalEarned)
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    initEmployee()
  }, [])

  const getLocation = async () => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (err) => {
          console.error('Geolocation error:', err)
          // Fallback to default location if denied
          resolve({ lat: 0, lng: 0 })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  const handleClockIn = async () => {
    try {
      setError('')
      setSuccessMessage('')

      if (!employee?.id) {
        setError('Employee profile not found')
        return
      }

      const coords = await getLocation()
      setLocation(coords)

      const { data: timeEntry, error: err } = await supabase
        .from('time_entries')
        .insert([
          {
            employee_id: employee.id,
            clock_in: new Date().toISOString(),
            latitude: coords.lat,
            longitude: coords.lng,
            approval_status: 'pending',
          },
        ])
        .select()
        .single()

      if (err) throw err

      setCurrentSession(timeEntry)
      setIsClockedIn(true)
      setSuccessMessage('✅ Clocked in successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleClockOut = async () => {
    try {
      setError('')
      setSuccessMessage('')

      if (!currentSession?.id) {
        setError('No active session')
        return
      }

      const clockOutTime = new Date()
      const clockInTime = new Date(currentSession.clock_in)
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

      const coords = await getLocation()
      setLocation(coords)

      const { error: err } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          hours_worked: Math.round(hoursWorked * 100) / 100,
          latitude: coords.lat,
          longitude: coords.lng,
        })
        .eq('id', currentSession.id)

      if (err) throw err

      setIsClockedIn(false)
      setCurrentSession(null)
      setSuccessMessage(`✅ Clocked out! Worked ${hoursWorked.toFixed(2)} hours`)
      setTimeout(() => setSuccessMessage(''), 3000)

      // Reload data
      const { data: entries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)

      const totalHours = entries?.reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0
      const totalEarned = totalHours * (employee?.hourly_rate || 0)
      setHoursWorked(totalHours)
      setTotalEarnings(totalEarned)
    } catch (err: any) {
      setError(err.message)
    }
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>⏱️ Clock In/Out</h1>
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
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
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

        {/* Clock In/Out Card */}
        <div style={{
          background: isClockedIn 
            ? 'rgba(0, 217, 255, 0.1)' 
            : 'rgba(255, 221, 0, 0.1)',
          border: isClockedIn
            ? '2px solid rgba(0, 217, 255, 0.3)'
            : '2px solid rgba(255, 221, 0, 0.3)',
          borderRadius: '1rem',
          padding: '3rem 2rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: '900',
            marginBottom: '1rem',
            color: isClockedIn ? '#00d9ff' : '#ffdd00',
          }}>
            {isClockedIn ? '✓' : '○'}
          </div>
          
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {isClockedIn ? 'You are clocked in' : 'Ready to clock in'}
          </div>

          {isClockedIn && currentSession && (
            <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '2rem' }}>
              Since {new Date(currentSession.clock_in).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              padding: '1rem 3rem',
              background: isClockedIn ? '#ff006e' : '#00d9ff',
              color: isClockedIn ? '#fff' : '#000',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>

        {/* Location */}
        {location && location.lat !== 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            fontSize: '0.875rem',
          }}>
            <div style={{ marginBottom: '0.5rem' }}>📍 Location Captured</div>
            <div style={{ color: '#999' }}>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          </div>
        )}

        {/* Earnings Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          <div style={{
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#00d9ff', marginBottom: '0.5rem' }}>
              Total Earnings
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900' }}>
              ${totalEarnings.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 221, 0, 0.1)',
            border: '1px solid rgba(255, 221, 0, 0.3)',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#ffdd00', marginBottom: '0.5rem' }}>
              Hours Worked
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900' }}>
              {hoursWorked.toFixed(1)} hrs
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
