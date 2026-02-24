import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { action, lat, lng, entryId } = await request.json()
    const supabase = createServiceClient()

    // Get employee record
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (empErr || !employee) {
      return Response.json({ error: 'Employee record not found' }, { status: 404 })
    }

    if (action === 'clock_in') {
      // Check not already clocked in
      const { data: existing } = await supabase
        .from('time_entries')
        .select('id')
        .eq('employee_id', employee.id)
        .is('clock_out', null)
        .single()

      if (existing) {
        return Response.json({ error: 'Already clocked in' }, { status: 400 })
      }

      const { data: entry, error: insertErr } = await supabase
        .from('time_entries')
        .insert([{
          employee_id: employee.id,
          clock_in: new Date().toISOString(),
          latitude: lat || null,
          longitude: lng || null,
          approval_status: 'pending',
        }])
        .select()
        .single()

      if (insertErr) {
        return Response.json({ error: insertErr.message }, { status: 500 })
      }

      return Response.json({ success: true, entry })
    }

    if (action === 'clock_out') {
      if (!entryId) {
        return Response.json({ error: 'Entry ID required for clock out' }, { status: 400 })
      }

      // Fetch the entry to compute hours
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('clock_in')
        .eq('id', entryId)
        .eq('employee_id', employee.id)
        .single()

      if (!existingEntry) {
        return Response.json({ error: 'Time entry not found' }, { status: 404 })
      }

      const clockOutTime = new Date()
      const clockInTime = new Date(existingEntry.clock_in)
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

      const { data: updated, error: updateErr } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          hours_worked: Math.round(hoursWorked * 100) / 100,
        })
        .eq('id', entryId)
        .select()
        .single()

      if (updateErr) {
        return Response.json({ error: updateErr.message }, { status: 500 })
      }

      return Response.json({ success: true, entry: updated })
    }

    return Response.json({ error: 'Invalid action. Use clock_in or clock_out' }, { status: 400 })
  } catch (err: any) {
    console.error('Clock error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
