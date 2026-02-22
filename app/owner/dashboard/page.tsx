'use client'

import { useState } from 'react'
import Link from 'next/link'

// Mock data
const mockEmployees = [
  { id: 1, name: 'John Martinez', role: 'Contractor', hoursThisWeek: 40, rate: 25, status: 'active', approval: 'pending' },
  { id: 2, name: 'Sarah Johnson', role: 'Employee', hoursThisWeek: 38, rate: 30, status: 'active', approval: 'approved' },
  { id: 3, name: 'Mike Chen', role: 'Contractor', hoursThisWeek: 32, rate: 28, status: 'clocked-in', approval: 'pending' },
  { id: 4, name: 'Emma Davis', role: 'Employee', hoursThisWeek: 40, rate: 35, status: 'active', approval: 'approved' },
]

const mockProjects = [
  { id: 1, name: 'Downtown Renovation', assignedTo: ['John Martinez', 'Mike Chen'], progress: 65 },
  { id: 2, name: 'Office Remodel', assignedTo: ['Sarah Johnson'], progress: 45 },
]

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'payroll' | 'projects'>('overview')
  const [approvals, setApprovals] = useState(mockEmployees.filter(e => e.approval === 'pending'))

  const calculatePay = (hours: number, rate: number) => (hours * rate).toFixed(2)
  const totalPayroll = mockEmployees.reduce((sum, emp) => sum + (emp.hoursThisWeek * emp.rate), 0)

  const handleApprovePayroll = (id: number) => {
    setApprovals(prev => prev.filter(e => e.id !== id))
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
            ⏱️ TimeClok Owner
          </h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#999' }}>Company Name</span>
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
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                  background: activeTab === tab ? '#00d9ff' : 'transparent',
                  color: activeTab === tab ? '#000' : '#999',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>Active Employees</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00d9ff' }}>
                    {mockEmployees.filter(e => e.status === 'active' || e.status === 'clocked-in').length}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>Weekly Payroll</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ff006e' }}>
                    ${totalPayroll.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                }}>
                  <div style={{ color: '#999', marginBottom: '0.5rem' }}>Pending Approvals</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffdd00' }}>
                    {approvals.length}
                  </div>
                </div>
              </div>

              {/* Pending Approvals */}
              {approvals.length > 0 && (
                <div style={{
                  background: 'rgba(255, 221, 0, 0.1)',
                  border: '2px solid #ffdd00',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  marginTop: '2rem',
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                    ⚠️ Pending Payroll Approvals
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {approvals.map(emp => (
                      <div key={emp.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                      }}>
                        <div>
                          <div style={{ fontWeight: '700' }}>{emp.name}</div>
                          <div style={{ color: '#999', fontSize: '0.875rem' }}>
                            {emp.hoursThisWeek} hours × ${emp.rate}/hr = ${calculatePay(emp.hoursThisWeek, emp.rate)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleApprovePayroll(emp.id)}
                          style={{
                            background: '#00d9ff',
                            color: '#000',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              <button style={{
                background: '#00d9ff',
                color: '#000',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '700',
                marginBottom: '1.5rem',
                cursor: 'pointer',
              }}>
                + Invite Employee
              </button>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                {mockEmployees.map(emp => (
                  <div key={emp.id} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{emp.name}</h3>
                        <p style={{ color: '#999', fontSize: '0.875rem' }}>{emp.role}</p>
                      </div>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: emp.status === 'clocked-in' ? '#00ff00' : '#666',
                      }} />
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      color: '#bbb',
                      marginBottom: '1rem',
                    }}>
                      <span>{emp.hoursThisWeek}h this week</span>
                      <span>${emp.rate}/hr</span>
                    </div>
                    <button style={{
                      width: '100%',
                      background: 'rgba(0, 217, 255, 0.1)',
                      border: '1px solid #00d9ff',
                      color: '#00d9ff',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}>
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                Week of Feb 17-23, 2026
              </h2>
              <div style={{
                overflowX: 'auto',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700' }}>Employee</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Hours</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Rate</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Total</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockEmployees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <td style={{ padding: '1rem' }}>{emp.name}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{emp.hoursThisWeek}h</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${emp.rate}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '700' }}>
                          ${calculatePay(emp.hoursThisWeek, emp.rate)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            background: emp.approval === 'approved' ? '#00ff0020' : '#ffdd0020',
                            color: emp.approval === 'approved' ? '#00ff00' : '#ffdd00',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                          }}>
                            {emp.approval === 'approved' ? '✓ Approved' : '⏳ Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid #00d9ff',
                borderRadius: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>Total Weekly Payroll</span>
                <span style={{ fontSize: '2rem', fontWeight: '900', color: '#00d9ff' }}>
                  ${totalPayroll.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              <button style={{
                background: '#ff006e',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '700',
                marginBottom: '1.5rem',
                cursor: 'pointer',
              }}>
                + New Project
              </button>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}>
                {mockProjects.map(proj => (
                  <div key={proj.id} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                      {proj.name}
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Progress: {proj.progress}%
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          background: '#00d9ff',
                          height: '100%',
                          width: `${proj.progress}%`,
                        }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#999', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Assigned To
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {proj.assignedTo.map(name => (
                          <span key={name} style={{
                            background: '#ff006e',
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                          }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#999',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}>
                      Edit Project
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
