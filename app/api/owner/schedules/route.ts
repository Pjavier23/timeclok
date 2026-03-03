import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

  const url = new URL(request.url)
  const from = url.searchParams.get('from') || new Date().toISOString().slice(0, 10)
  const to = url.searchParams.get('to') || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*, employees(id, users(full_name, email))')
      .eq('company_id', userData.company_id)
      .gte('shift_date', from)
      .lte('shift_date', to)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) return Response.json({ schedules: [], migrationNeeded: true })
    return Response.json({ schedules: data || [] })
  } catch {
    return Response.json({ schedules: [], migrationNeeded: true })
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

  const body = await request.json()
  const { employee_id, shift_date, start_time, end_time, location, notes } = body

  if (!employee_id || !shift_date || !start_time || !end_time) {
    return Response.json({ error: 'employee_id, shift_date, start_time, end_time are required' }, { status: 400 })
  }

  // Verify employee belongs to company
  const { data: emp } = await supabase.from('employees').select('id').eq('id', employee_id).eq('company_id', userData.company_id).single()
  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

  try {
    const { data, error } = await supabase.from('schedules').insert([{
      company_id: userData.company_id,
      employee_id,
      shift_date,
      start_time,
      end_time,
      location: location || null,
      notes: notes || null,
      created_by: user.id,
    }]).select('*, employees(id, users(full_name, email))').single()

    if (error) return Response.json({ error: error.message, migrationNeeded: true }, { status: 500 })
    return Response.json({ schedule: data })
  } catch {
    return Response.json({ error: 'Schedule table not set up yet. Run migration 003_schedules.sql', migrationNeeded: true }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

  const { id } = await request.json()
  try {
    const { error } = await supabase.from('schedules').delete().eq('id', id).eq('company_id', userData.company_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
