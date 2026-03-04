import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

  try {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*, employees(id, users(full_name, email))')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ requests: [], migrationNeeded: true })
    return Response.json({ requests: data || [] })
  } catch {
    return Response.json({ requests: [], migrationNeeded: true })
  }
}

export async function PATCH(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) return Response.json({ error: 'No company' }, { status: 403 })

  const body = await request.json()
  const { id, action, denial_reason } = body

  if (!id || !action || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'id and action (approve|deny) are required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('time_off_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'denied',
        denial_reason: action === 'deny' ? (denial_reason || null) : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .select('*')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ request: data })
  } catch {
    return Response.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
