import { getUserFromToken, createServiceClient } from '../../../../lib/supabase-server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(auth.slice(7))
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const supabase = createServiceClient()
  const url = new URL(request.url)
  const periodStart = url.searchParams.get('start')
  const periodEnd   = url.searchParams.get('end')

  // Get owner's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id, full_name, companies(name, pay_schedule)')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return Response.json({ error: 'Company not found' }, { status: 404 })

  const companyId = userData.company_id
  const company = (userData as any).companies

  // Get all employees for this company
  const { data: employees } = await supabase
    .from('employees')
    .select('id, hourly_rate, employee_type, position, users(full_name, email)')
    .eq('company_id', companyId)

  // Get time entries for the period
  let teQuery = supabase
    .from('time_entries')
    .select('employee_id, clock_in, clock_out, hours_worked, approval_status')
    .in('employee_id', (employees || []).map((e: any) => e.id))
    .eq('approval_status', 'approved')
    .not('hours_worked', 'is', null)

  if (periodStart) teQuery = teQuery.gte('clock_in', periodStart)
  if (periodEnd)   teQuery = teQuery.lte('clock_in', periodEnd + 'T23:59:59')

  const { data: entries } = await teQuery

  // Aggregate hours per employee
  const empMap: Record<string, any> = {}
  for (const emp of employees || []) {
    empMap[emp.id] = {
      id: emp.id,
      name: (emp as any).users?.full_name || (emp as any).users?.email?.split('@')[0] || 'Unknown',
      email: (emp as any).users?.email || '',
      hourlyRate: emp.hourly_rate || 0,
      employeeType: emp.employee_type || 'w2',
      position: emp.position || '',
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
      grossPay: 0,
      deductions: 0,
      netPay: 0,
    }
  }

  for (const e of entries || []) {
    const emp = empMap[e.employee_id]
    if (!emp) continue
    const h = e.hours_worked || 0
    emp.totalHours += h
  }

  // Calculate pay (overtime > 40h/week at 1.5x)
  for (const emp of Object.values(empMap) as any[]) {
    const reg = Math.min(emp.totalHours, 40)
    const ot  = Math.max(0, emp.totalHours - 40)
    emp.regularHours  = Math.round(reg * 100) / 100
    emp.overtimeHours = Math.round(ot * 100) / 100
    emp.grossPay = Math.round((reg * emp.hourlyRate + ot * emp.hourlyRate * 1.5) * 100) / 100
    emp.netPay   = emp.grossPay - emp.deductions
  }

  const rows = Object.values(empMap).filter((e: any) => e.totalHours > 0)
  const totals = {
    regularHours:  rows.reduce((s: number, e: any) => s + e.regularHours, 0),
    overtimeHours: rows.reduce((s: number, e: any) => s + e.overtimeHours, 0),
    totalHours:    rows.reduce((s: number, e: any) => s + e.totalHours, 0),
    grossPay:      rows.reduce((s: number, e: any) => s + e.grossPay, 0),
    deductions:    rows.reduce((s: number, e: any) => s + e.deductions, 0),
    netPay:        rows.reduce((s: number, e: any) => s + e.netPay, 0),
  }

  return Response.json({
    company: { name: company?.name || 'Your Company', paySchedule: company?.pay_schedule || 'weekly' },
    period: { start: periodStart, end: periodEnd },
    generatedAt: new Date().toISOString(),
    employees: rows,
    totals,
  })
}
