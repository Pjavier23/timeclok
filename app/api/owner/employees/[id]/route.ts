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
