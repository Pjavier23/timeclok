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

    const supabase = createServiceClient()

    // Get owner's company
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (companyErr || !company) {
      return Response.json({ error: 'Company not found — owner access required' }, { status: 403 })
    }

    // Get all pending payroll records for this company's employees
    const { data: pendingRecords, error: fetchErr } = await supabase
      .from('payroll')
      .select('id, employees!inner(company_id)')
      .eq('status', 'pending')
      .eq('employees.company_id', company.id)

    if (fetchErr) {
      return Response.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return Response.json({ success: true, approved: 0, message: 'No pending payroll records found' })
    }

    const ids = pendingRecords.map((r: any) => r.id)

    const { error: updateErr } = await supabase
      .from('payroll')
      .update({ status: 'approved' })
      .in('id', ids)

    if (updateErr) {
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      approved: ids.length,
      message: `${ids.length} payroll record${ids.length === 1 ? '' : 's'} approved`,
    })
  } catch (err: any) {
    console.error('Bulk approve error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
