import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export async function POST(request: Request) {
  try {
    const { companyId, userId } = await request.json()

    if (!companyId || !userId) {
      return Response.json({ error: 'companyId and userId required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, anonKey)

    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError) throw companyError

    // Fetch employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)

    if (empError) throw empError

    // Fetch projects
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)

    if (projError) throw projError

    // Fetch time entries (only if we have employees)
    let timeEntries = []
    if (employees && employees.length > 0) {
      const { data: entries, error: timeError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employees[0].id)
        .limit(5)

      if (timeError) console.warn('Time entries error:', timeError.message)
      else timeEntries = entries || []
    }

    // Fetch payroll (only if we have employees)
    let payroll = []
    if (employees && employees.length > 0) {
      const { data: payrollData, error: payError } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employees[0].id)
        .limit(5)

      if (payError) console.warn('Payroll error:', payError.message)
      else payroll = payrollData || []
    }

    return Response.json({
      company,
      employees: employees?.length || 0,
      projects: projects?.length || 0,
      timeEntries: timeEntries?.length || 0,
      payroll: payroll?.length || 0,
      data: {
        company,
        employeeCount: employees?.length,
        projectCount: projects?.length,
        timeEntriesSample: timeEntries?.[0],
        payrollSample: payroll?.[0],
      },
    })
  } catch (err: any) {
    console.error('Test error:', err)
    return Response.json({ error: err.message || 'Test failed' }, { status: 400 })
  }
}
