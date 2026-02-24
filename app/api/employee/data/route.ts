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
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, company_id, user_type')
      .eq('id', user.id)
      .single()

    // Get employee record
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (empErr && empErr.code !== 'PGRST116') {
      console.error('Employee query error:', empErr)
    }

    // Get time entries
    let timeEntries: any[] = []
    if (employee?.id) {
      const { data: te } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('clock_in', { ascending: false })
        .limit(30)
      timeEntries = te || []
    }

    // Get payroll
    let payroll: any[] = []
    if (employee?.id) {
      const { data: pr } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employee.id)
        .order('week_ending', { ascending: false })
        .limit(10)
      payroll = pr || []
    }

    // Active session (clocked in but not out)
    const activeEntry = timeEntries.find((e: any) => !e.clock_out) || null

    // Stats
    const totalHours = timeEntries
      .filter((e: any) => e.hours_worked)
      .reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0)

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const weeklyHours = timeEntries
      .filter((e: any) => e.clock_in >= weekAgo && e.hours_worked)
      .reduce((sum: number, e: any) => sum + (e.hours_worked || 0), 0)

    const totalGross = Math.round(totalHours * (employee?.hourly_rate || 0) * 100) / 100

    // Sum all tax withheld from payroll records
    const totalTaxReserved = payroll
      .reduce((sum: number, pr: any) => sum + (pr.tax_withheld || 0), 0)

    return Response.json({
      user: { id: user.id, email: user.email, ...userData },
      employee: employee || null,
      timeEntries,
      payroll,
      activeEntry,
      stats: {
        totalHours: Math.round(totalHours * 10) / 10,
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        totalGross,
        totalTaxReserved: Math.round(totalTaxReserved * 100) / 100,
        totalNet: Math.round((totalGross - totalTaxReserved) * 100) / 100,
        hourlyRate: employee?.hourly_rate || 0,
        taxReserveEnabled: employee?.tax_reserve_enabled ?? false,
        taxReservePerPeriod: employee?.tax_reserve_per_period ?? 25.00,
      },
    })
  } catch (err: any) {
    console.error('Employee data error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
