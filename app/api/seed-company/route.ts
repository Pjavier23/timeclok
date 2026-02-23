import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

export async function POST(request: Request) {
  try {
    const { companyId, ownerId } = await request.json()

    if (!companyId || !ownerId) {
      return Response.json({ error: 'companyId and ownerId required' }, { status: 400 })
    }

    if (!serviceRoleKey) {
      return Response.json({ error: 'Service role not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Create sample employees
    const sampleEmployees = [
      {
        user_id: `emp-${Date.now()}-1`,
        company_id: companyId,
        hourly_rate: 25.00,
        employee_type: 'w2',
      },
      {
        user_id: `emp-${Date.now()}-2`,
        company_id: companyId,
        hourly_rate: 30.00,
        employee_type: '1099',
      },
      {
        user_id: `emp-${Date.now()}-3`,
        company_id: companyId,
        hourly_rate: 22.50,
        employee_type: 'w2',
      },
    ]

    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .insert(sampleEmployees)
      .select()

    if (empError) {
      console.warn('Employee seeding warning:', empError.message)
    }

    // Create sample projects
    const sampleProjects = [
      {
        company_id: companyId,
        name: 'Website Redesign',
        description: 'Redesign company website',
        status: 'active',
      },
      {
        company_id: companyId,
        name: 'Mobile App Dev',
        description: 'Build mobile application',
        status: 'active',
      },
      {
        company_id: companyId,
        name: 'Q1 Marketing',
        description: 'Q1 marketing campaign',
        status: 'completed',
      },
    ]

    const { data: projectsData, error: projError } = await supabase
      .from('projects')
      .insert(sampleProjects)
      .select()

    if (projError) {
      console.warn('Project seeding warning:', projError.message)
    }

    // Create sample time entries for last 7 days
    if (employeesData && employeesData.length > 0) {
      const timeEntries = []
      const now = new Date()

      for (let day = 0; day < 7; day++) {
        for (let emp of employeesData.slice(0, 2)) {
          const clockInTime = new Date(now)
          clockInTime.setDate(clockInTime.getDate() - day)
          clockInTime.setHours(9, 0, 0, 0)

          const clockOutTime = new Date(clockInTime)
          clockOutTime.setHours(17, 0, 0, 0)

          timeEntries.push({
            employee_id: emp.id,
            project_id: projectsData?.[0]?.id || null,
            clock_in: clockInTime.toISOString(),
            clock_out: clockOutTime.toISOString(),
            latitude: 40.7128,
            longitude: -74.006,
            hours_worked: 8,
            approval_status: day < 2 ? 'pending' : 'approved',
            approved_by: day < 2 ? null : ownerId,
          })
        }
      }

      const { error: timeError } = await supabase
        .from('time_entries')
        .insert(timeEntries)

      if (timeError) {
        console.warn('Time entries seeding warning:', timeError.message)
      }
    }

    // Create sample payroll
    if (employeesData && employeesData.length > 0) {
      const payrollRecords = employeesData.map((emp: any) => ({
        employee_id: emp.id,
        week_ending: new Date().toISOString().split('T')[0],
        total_hours: 40,
        hourly_rate: emp.hourly_rate,
        total_amount: 40 * emp.hourly_rate,
        status: 'pending',
        supervisor_id: ownerId,
      }))

      const { error: payError } = await supabase
        .from('payroll')
        .insert(payrollRecords)

      if (payError) {
        console.warn('Payroll seeding warning:', payError.message)
      }
    }

    return Response.json(
      {
        success: true,
        message: 'Sample data created',
        data: {
          employees: employeesData?.length || 0,
          projects: projectsData?.length || 0,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Seeding error:', err)
    return Response.json({ error: err.message || 'Seeding failed' }, { status: 400 })
  }
}
