import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

// PATCH — employee can only update avatar_url and address
export async function PATCH(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const body = await request.json()

  // Whitelist: only avatar_url, address, phone, and last-4 tax_id allowed
  const allowed: Record<string, unknown> = {}
  if (body.avatar_url !== undefined) allowed.avatar_url = body.avatar_url
  if (body.address !== undefined) allowed.address = body.address
  if (body.phone !== undefined) allowed.phone = body.phone
  // tax_id: employee can only submit last 4 digits
  if (body.tax_id !== undefined) {
    const last4 = String(body.tax_id).replace(/\D/g, '').slice(-4)
    if (last4.length === 4) allowed.tax_id = `***-**-${last4}`
  }

  if (Object.keys(allowed).length === 0) {
    return Response.json({ error: 'No allowed fields to update' }, { status: 400 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

  const { error } = await supabase
    .from('employees')
    .update(allowed)
    .eq('id', emp.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
