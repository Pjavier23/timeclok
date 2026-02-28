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

    const { action, lat, lng, entryId, notes } = await request.json()
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

      // Reverse geocode coordinates → human-readable address (free, no API key)
      let locationName: string | null = null
      if (lat && lng) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'User-Agent': 'TimeClok/1.0 (timeclok.vercel.app)' } }
          )
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const a = geoData.address || {}
            // Build a clean short address: "123 Main St, Miami, FL"
            const parts = [
              a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
              a.city || a.town || a.village || a.suburb || a.neighbourhood,
              a.state_code || a.state,
            ].filter(Boolean)
            locationName = parts.join(', ') || geoData.display_name?.split(',').slice(0, 3).join(',').trim() || null
          }
        } catch {
          // Geocoding failed — just store coords only, no crash
        }
      }

      const insertPayload: Record<string, any> = {
        employee_id: employee.id,
        clock_in: new Date().toISOString(),
        latitude: lat || null,
        longitude: lng || null,
        approval_status: 'pending',
      }

      // Try inserting with location_name; fall back if column doesn't exist yet
      if (locationName) {
        const { data: entryWithLoc, error: errWithLoc } = await supabase
          .from('time_entries')
          .insert([{ ...insertPayload, location_name: locationName }])
          .select()
          .single()
        if (!errWithLoc) return Response.json({ success: true, entry: entryWithLoc, locationName })
        // Column missing — fall through to insert without it
      }

      const { data: entry, error: insertErr } = await supabase
        .from('time_entries')
        .insert([insertPayload])
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

      const baseUpdate: Record<string, any> = {
        clock_out: clockOutTime.toISOString(),
        hours_worked: Math.round(hoursWorked * 100) / 100,
      }

      // Try with notes first (gracefully fall back if column doesn't exist)
      if (notes && notes.trim()) {
        const { data: updated, error: updateErr } = await supabase
          .from('time_entries')
          .update({ ...baseUpdate, notes: notes.trim() })
          .eq('id', entryId)
          .select()
          .single()

        // If notes column doesn't exist, retry without it
        if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('notes') || updateErr.message?.includes('column'))) {
          const { data: updated2, error: updateErr2 } = await supabase
            .from('time_entries')
            .update(baseUpdate)
            .eq('id', entryId)
            .select()
            .single()

          if (updateErr2) {
            return Response.json({ error: updateErr2.message }, { status: 500 })
          }
          return Response.json({ success: true, entry: updated2, notesSkipped: true })
        }

        if (updateErr) {
          return Response.json({ error: updateErr.message }, { status: 500 })
        }

        return Response.json({ success: true, entry: updated })
      }

      // No notes — standard update
      const { data: updated, error: updateErr } = await supabase
        .from('time_entries')
        .update(baseUpdate)
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
