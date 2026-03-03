'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

function PayrollReportContent() {
  const supabase = createClient()
  const params = useSearchParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const statusFilter = params.get('status') || 'all'
  const dateFrom = params.get('from') || ''

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/employee/data', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'Georgia, serif', color: '#555' }}>Generating report...</div>
  if (!data) return <div style={{ padding: '4rem', textAlign: 'center' }}>Not authenticated.</div>

  const { user, company, employee, payroll } = data
  const filtered = (payroll || []).filter((pr: any) => {
    if (statusFilter !== 'all' && pr.status !== statusFilter) return false
    if (dateFrom && pr.week_ending < dateFrom) return false
    return true
  })

  const totalHours = filtered.reduce((s: number, pr: any) => s + (pr.total_hours || 0), 0)
  const totalGross = filtered.reduce((s: number, pr: any) => s + (pr.total_amount || 0), 0)
  const totalTax   = filtered.reduce((s: number, pr: any) => s + (pr.tax_withheld || 0), 0)
  const totalNet   = filtered.reduce((s: number, pr: any) => s + (pr.net_amount ?? pr.total_amount ?? 0), 0)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const empName = user?.full_name || user?.email || 'Employee'

  const statusColor = (s: string) => s === 'paid' ? '#166534' : s === 'approved' ? '#1e40af' : '#92400e'
  const statusBg = (s: string) => s === 'paid' ? '#dcfce7' : s === 'approved' ? '#dbeafe' : '#fef3c7'

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', background: '#fff', color: '#111', minHeight: '100vh' }}>
      {/* Toolbar — hidden when printing */}
      <div className="no-print" style={{ background: '#1a1a1a', padding: '0.875rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#aaa', fontSize: '0.875rem' }}>Payroll Report — <strong style={{ color: '#fff' }}>{empName}</strong></span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => window.print()} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem' }}>
            🖨 Print / Save PDF
          </button>
          <button onClick={() => window.close()} style={{ background: 'transparent', color: '#555', border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 2.5rem' }}>
        {/* Header */}
        <div style={{ borderBottom: '3px solid #111', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em' }}>{empName}</div>
              <div style={{ fontSize: '1rem', color: '#555', marginTop: '0.25rem' }}>Personal Payroll Statement</div>
              {employee?.position && <div style={{ fontSize: '0.875rem', color: '#777', marginTop: '0.1rem' }}>{employee.position}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>{company?.name || 'Employer'}</div>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>Generated {today}</div>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>Rate: ${(employee?.hourly_rate || 0).toFixed(2)}/hr</div>
            </div>
          </div>
        </div>

        {/* Filter info */}
        {(statusFilter !== 'all' || dateFrom) && (
          <div style={{ background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#666' }}>
            Filtered: {statusFilter !== 'all' ? `Status = ${statusFilter}` : ''}{statusFilter !== 'all' && dateFrom ? ' · ' : ''}{dateFrom ? `From ${dateFrom}` : ''}
          </div>
        )}

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Hours', value: `${totalHours.toFixed(2)} hrs` },
            { label: 'Gross Pay', value: `$${totalGross.toFixed(2)}` },
            { label: 'Tax Reserved', value: `$${totalTax.toFixed(2)}` },
            { label: 'Net Pay', value: `$${totalNet.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} style={{ border: '2px solid #111', borderRadius: '6px', padding: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Payroll table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ background: '#111', color: '#fff' }}>
              {['Week Ending', 'Hours', 'Rate', 'Gross Pay', 'Tax Reserved', 'Net Pay', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: h === 'Week Ending' || h === 'Status' ? 'left' : 'right', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No records match the selected filters.</td></tr>
            ) : filtered.map((pr: any, i: number) => {
              const gross = pr.total_amount || 0
              const tax = pr.tax_withheld || 0
              const net = pr.net_amount ?? gross
              return (
                <tr key={pr.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                  <td style={{ padding: '0.75rem 0.875rem', fontWeight: '600' }}>{pr.week_ending}</td>
                  <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right' }}>{(pr.total_hours || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right' }}>${(pr.hourly_rate || employee?.hourly_rate || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right' }}>${gross.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', color: tax > 0 ? '#92400e' : '#aaa' }}>{tax > 0 ? `$${tax.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: '700' }}>${net.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 0.875rem' }}>
                    <span style={{ background: statusBg(pr.status), color: statusColor(pr.status), padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>{pr.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: '#111', color: '#fff' }}>
                <td style={{ padding: '0.875rem', fontWeight: '700' }}>TOTALS</td>
                <td style={{ padding: '0.875rem', textAlign: 'right', fontWeight: '700' }}>{totalHours.toFixed(2)}</td>
                <td style={{ padding: '0.875rem' }}></td>
                <td style={{ padding: '0.875rem', textAlign: 'right', fontWeight: '700' }}>${totalGross.toFixed(2)}</td>
                <td style={{ padding: '0.875rem', textAlign: 'right', fontWeight: '700' }}>{totalTax > 0 ? `$${totalTax.toFixed(2)}` : '—'}</td>
                <td style={{ padding: '0.875rem', textAlign: 'right', fontWeight: '700', fontSize: '1rem' }}>${totalNet.toFixed(2)}</td>
                <td style={{ padding: '0.875rem' }}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Signature */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
          {['Employee Signature', 'Employer / Payroll Signature'].map(l => (
            <div key={l}>
              <div style={{ borderBottom: '1px solid #111', height: '2.5rem', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.78rem', color: '#555' }}>{l}</div>
              <div style={{ borderBottom: '1px solid #ccc', height: '1.75rem', marginTop: '1rem', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.78rem', color: '#555' }}>Date</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '0.72rem', color: '#aaa' }}>
          Generated by TimeClok · timeclok.vercel.app · {today}
        </div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
    </div>
  )
}

export default function EmployeePayrollReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>}>
      <PayrollReportContent />
    </Suspense>
  )
}
