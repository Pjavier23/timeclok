'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [userType, setUserType] = useState<'owner' | 'employee' | null>(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '900',
          marginBottom: '1rem',
          color: '#fff',
        }}>
          ⏱️ TimeClok
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: '#bbb',
          marginBottom: '3rem',
        }}>
          Time tracking & payroll for modern teams. Clock in, get paid, stay organized.
        </p>

        {!userType ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
          }}>
            {/* Owner Card */}
            <div
              onClick={() => setUserType('owner')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid #00d9ff',
                borderRadius: '1rem',
                padding: '2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(-8px)'
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👔</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Owner/Manager
              </h2>
              <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                Manage employees, approve payroll, track projects
              </p>
              <div style={{
                background: '#00d9ff',
                color: '#000',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
              }}>
                Continue →
              </div>
            </div>

            {/* Employee Card */}
            <div
              onClick={() => setUserType('employee')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid #ff006e',
                borderRadius: '1rem',
                padding: '2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(-8px)'
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Employee/Contractor
              </h2>
              <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                Clock in/out, track hours, view earnings
              </p>
              <div style={{
                background: '#ff006e',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
              }}>
                Continue →
              </div>
            </div>
          </div>
        ) : userType === 'owner' ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>
              Owner Login
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <input
                type="email"
                placeholder="Email"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                }}
              />
              <input
                type="password"
                placeholder="Password"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                }}
              />
            </div>
            <Link href="/owner/dashboard">
              <button style={{
                width: '100%',
                background: '#00d9ff',
                color: '#000',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                border: 'none',
                marginBottom: '1rem',
              }}>
                Login as Owner
              </button>
            </Link>
            <button
              onClick={() => setUserType(null)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#999',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              Back
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>
              Employee Login
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <input
                type="email"
                placeholder="Email"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                }}
              />
              <input
                type="password"
                placeholder="Password"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                }}
              />
            </div>
            <Link href="/employee/dashboard">
              <button style={{
                width: '100%',
                background: '#ff006e',
                color: '#fff',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                border: 'none',
                marginBottom: '1rem',
              }}>
                Login as Employee
              </button>
            </Link>
            <button
              onClick={() => setUserType(null)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#999',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
