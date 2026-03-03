import { getUserFromToken, createServiceClient } from '../../../../lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    // Verify owner owns this employee
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, user_type')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'No company' }, { status: 403 })
    }

    // Get employee with user info
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('*, users(id, email, full_name)')
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .single()

    if (empErr || !employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Get time entry stats
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out, hours_worked, approval_status, notes, latitude, longitude')
      .eq('employee_id', id)
      .order('clock_in', { ascending: false })

    const allEntries = timeEntries || []
    const totalHours = allEntries.reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0)
    const totalEarned = totalHours * (employee.hourly_rate || 0)
    const recentEntries = allEntries.slice(0, 5)

    return Response.json({
      employee,
      stats: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalEarned: Math.round(totalEarned * 100) / 100,
        entriesCount: allEntries.length,
      },
      recentEntries,
    })
  } catch (err: any) {
    console.error('Employee profile GET error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    // Verify ownership
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'No company' }, { status: 403 })
    }

    // Confirm employee belongs to this company
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .single()

    if (!existing) {
      return Response.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()

    // Only allow safe fields to be updated
    const allowed = ['position', 'start_date', 'tax_id', 'avatar_url', 'phone', 'address', 'notes', 'hourly_rate', 'employee_type']
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select('*, users(id, email, full_name)')
      .single()

    if (updateErr) {
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    return Response.json({ employee: updated })
  } catch (err: any) {
    console.error('Employee profile PATCH error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    // Verify owner
    const { data: userData } = await supabase.from('users').select('company_id, full_name, email, companies(name)').eq('id', user.id).single()
    if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

    const companyName = (userData as any).companies?.name || 'Your Company'

    // Get employee + stats before deleting
    const { data: emp } = await supabase.from('employees').select('*, users(id, email, full_name)').eq('id', id).eq('company_id', userData.company_id).single()
    if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

    const empUser = (emp as any).users
    const empName = empUser?.full_name || empUser?.email || 'Unknown'
    const empEmail = empUser?.email || ''

    // Get all time entries
    const { data: entries } = await supabase.from('time_entries').select('*').eq('employee_id', id).order('clock_in', { ascending: false })
    const allEntries = entries || []
    const totalHours = allEntries.reduce((s: number, e: any) => s + (e.hours_worked || 0), 0)
    const grossPay = Math.round(totalHours * (emp.hourly_rate || 0) * 100) / 100

    // Get payroll records
    const { data: payroll } = await supabase.from('payroll').select('*').eq('employee_id', id).order('week_ending', { ascending: false })

    // Build final report email
    const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const entriesHtml = allEntries.slice(0, 20).map((e: any) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #222;font-size:12px;">${new Date(e.clock_in).toLocaleDateString()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #222;font-size:12px;">${e.hours_worked?.toFixed(2) || '—'} hrs</td>
        <td style="padding:6px 12px;border-bottom:1px solid #222;font-size:12px;">$${((e.hours_worked || 0) * (emp.hourly_rate || 0)).toFixed(2)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #222;font-size:12px;color:#888;">${e.approval_status || 'pending'}</td>
      </tr>`).join('')

    const reportHtml = `<!DOCTYPE html><html><body style="background:#0f0f0f;font-family:sans-serif;color:#fff;padding:32px;">
      <h2 style="color:#00d9ff;">⏱ TimeClok — Final Employee Report</h2>
      <p style="color:#888;">Generated on ${reportDate} · ${companyName}</p>
      <hr style="border-color:#333;margin:24px 0;">
      <h3 style="margin:0 0 8px;">Employee: ${empName}</h3>
      <p style="color:#888;margin:0 0 4px;">Email: ${empEmail}</p>
      <p style="color:#888;margin:0 0 4px;">Position: ${emp.position || '—'}</p>
      <p style="color:#888;margin:0 0 4px;">Hourly Rate: $${(emp.hourly_rate || 0).toFixed(2)}/hr</p>
      <p style="color:#888;margin:0;">Start Date: ${emp.start_date || '—'}</p>
      <hr style="border-color:#333;margin:24px 0;">
      <h3>Summary</h3>
      <p>Total Hours Worked: <strong style="color:#00d9ff;">${totalHours.toFixed(2)} hrs</strong></p>
      <p>Total Gross Pay: <strong style="color:#22c55e;">$${grossPay.toFixed(2)}</strong></p>
      <p>Total Time Entries: <strong>${allEntries.length}</strong></p>
      <hr style="border-color:#333;margin:24px 0;">
      <h3>Time Entry History (last 20)</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#1a1a1a;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Date</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Hours</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Pay</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Status</th>
        </tr></thead>
        <tbody>${entriesHtml}</tbody>
      </table>
      <hr style="border-color:#333;margin:24px 0;">
      <p style="color:#555;font-size:12px;">This report was automatically generated by TimeClok upon employee profile deletion. Keep for your records.</p>
    </body></html>`

    // Send report email to owner
    const resendKey = process.env.RESEND_API_KEY
    let emailSent = false
    if (resendKey && userData.email) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'TimeClok <onboarding@resend.dev>',
          to: [userData.email],
          subject: `Final Report: ${empName} removed from ${companyName}`,
          html: reportHtml,
        }),
      })
      emailSent = res.ok
    }

    // Delete time entries, payroll, employee record, then auth user
    const empUserId = empUser?.id
    await supabase.from('time_entries').delete().eq('employee_id', id)
    await supabase.from('payroll').delete().eq('employee_id', id)
    await supabase.from('employees').delete().eq('id', id)
    if (empUserId) {
      await supabase.from('users').delete().eq('id', empUserId)
      await supabase.auth.admin.deleteUser(empUserId)
    }

    return Response.json({
      success: true,
      emailSent,
      message: emailSent
        ? `${empName} has been removed. A final report was sent to ${userData.email}.`
        : `${empName} has been removed. (Enable email to receive the final report.)`,
    })
  } catch (err: any) {
    console.error('Employee DELETE error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
