import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
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

    // Get user profile
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('company_id, user_type, full_name')
      .eq('id', user.id)
      .single()

    if (userErr || !userData) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!userData.company_id) {
      return Response.json({ error: 'No company associated with this account' }, { status: 404 })
    }

    // Get company
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single()

    if (compErr || !company) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get employees with user info
    const { data: employees } = await supabase
      .from('employees')
      .select('*, users(email, full_name)')
      .eq('company_id', company.id)

    const empIds = (employees || []).map((e: any) => e.id)

    // Get time entries
    let timeEntries: any[] = []
    if (empIds.length > 0) {
      const { data: te } = await supabase
        .from('time_entries')
        .select('*, employees(users(email, full_name))')
        .in('employee_id', empIds)
        .order('clock_in', { ascending: false })
        .limit(50)
      timeEntries = te || []
    }

    // Get payroll
    let payroll: any[] = []
    if (empIds.length > 0) {
      const { data: pr } = await supabase
        .from('payroll')
        .select('*, employees(users(email, full_name))')
        .in('employee_id', empIds)
        .order('created_at', { ascending: false })
      payroll = pr || []
    }

    // Calc weekly hours (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const weeklyHours = timeEntries
      .filter((e: any) => e.clock_in >= weekAgo && e.hours_worked)
      .reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0)

    const pendingPayrollTotal = payroll
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0)

    return Response.json({
      company,
      employees: employees || [],
      timeEntries,
      payroll,
      stats: {
        employeeCount: (employees || []).length,
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        pendingPayrollTotal: Math.round(pendingPayrollTotal * 100) / 100,
      },
    })
  } catch (err: any) {
    console.error('Owner data error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
