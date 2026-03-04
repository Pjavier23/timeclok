import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return Response.json({ requests: [] })

  try {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ requests: [], migrationNeeded: true })
    return Response.json({ requests: data || [] })
  } catch {
    return Response.json({ requests: [], migrationNeeded: true })
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: emp } = await supabase.from('employees').select('id, company_id').eq('user_id', user.id).single()
  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

  const body = await request.json()
  const { type, start_date, end_date, notes } = body

  if (!type || !start_date || !end_date) {
    return Response.json({ error: 'type, start_date, and end_date are required' }, { status: 400 })
  }
  if (new Date(end_date) < new Date(start_date)) {
    return Response.json({ error: 'End date must be on or after start date' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([{
        employee_id: emp.id,
        company_id: emp.company_id,
        type,
        start_date,
        end_date,
        notes: notes || null,
        status: 'pending',
      }])
      .select('*')
      .single()

    if (error) return Response.json({ error: error.message, migrationNeeded: true }, { status: 500 })
    return Response.json({ request: data })
  } catch {
    return Response.json({ error: 'Table not set up yet. Run migration 005_time_off.sql', migrationNeeded: true }, { status: 500 })
  }
}
