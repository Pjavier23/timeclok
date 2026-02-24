import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

// GET current tax reserve settings
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(authHeader.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('tax_reserve_enabled, tax_reserve_per_period')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    tax_reserve_enabled: employee?.tax_reserve_enabled ?? false,
    tax_reserve_per_period: employee?.tax_reserve_per_period ?? 25.00,
  })
}

// PATCH to update tax reserve settings
export async function PATCH(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserFromToken(authHeader.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const { tax_reserve_enabled, tax_reserve_per_period } = await request.json()

  if (typeof tax_reserve_per_period === 'number' && tax_reserve_per_period < 0) {
    return Response.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('employees')
    .update({
      tax_reserve_enabled: Boolean(tax_reserve_enabled),
      tax_reserve_per_period: Number(tax_reserve_per_period) || 25.00,
    })
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, message: 'Tax reserve settings saved.' })
}
