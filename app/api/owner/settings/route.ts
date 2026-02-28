import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return Response.json({ error: 'No company found' }, { status: 404 })

    const { data: company } = await supabase.from('companies').select('*').eq('id', userData.company_id).single()
    return Response.json({ company })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return Response.json({ error: 'No company found' }, { status: 404 })

    const body = await request.json()
    const allowed = ['name', 'pay_schedule', 'overtime_threshold', 'timezone']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }

    // Try updating with all fields; gracefully ignore unknown columns
    const { data, error } = await supabase
      .from('companies')
      .update(update)
      .eq('id', userData.company_id)
      .select()
      .single()

    if (error) {
      // If column doesn't exist yet, try with just the fields that do exist
      if (error.code === '42703') {
        const safeUpdate: Record<string, any> = {}
        if (update.name) safeUpdate.name = update.name
        const { data: d2, error: e2 } = await supabase
          .from('companies')
          .update(safeUpdate)
          .eq('id', userData.company_id)
          .select()
          .single()
        if (e2) return Response.json({ error: e2.message, migration_needed: true }, { status: 500 })
        return Response.json({ success: true, company: d2, migration_needed: true })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, company: data })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
