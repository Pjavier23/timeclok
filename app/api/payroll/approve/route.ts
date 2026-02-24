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

    const { payrollId, status } = await request.json()
    if (!payrollId || !['approved', 'paid', 'pending'].includes(status)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify this owner owns the company that has this employee
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('payroll')
      .update(updateData)
      .eq('id', payrollId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, payroll: data })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
