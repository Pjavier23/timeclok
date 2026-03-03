import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user.id).single()
  if (!emp) return Response.json({ schedules: [] })

  const from = new Date().toISOString().slice(0, 10)
  const to = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('employee_id', emp.id)
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
