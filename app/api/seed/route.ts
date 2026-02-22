export async function POST(request: Request) {
  try {
    const anonKey = 'sb_publishable_DStZYSJI03dZY_k-all'
    const supabaseUrl = 'https://tkljofxcndnwqyqrtrnx.supabase.co'

    // Step 1: Insert employee
    const empResponse = await fetch(`${supabaseUrl}/rest/v1/employees`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        company_id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        hourly_rate: 25,
        employee_type: '1099',
      }),
    })

    const empData = await empResponse.json()
    if (!empResponse.ok) {
      console.error('Employee insert failed:', empData)
      return Response.json({ error: 'Failed to create employee', details: empData }, { status: 400 })
    }

    const employeeId = empData[0].id
    console.log('✅ Employee created:', employeeId)

    // Step 2: Insert time entry
    const clockIn = new Date()
    clockIn.setDate(clockIn.getDate() - 3)
    const clockOut = new Date(clockIn)
    clockOut.setHours(clockOut.getHours() + 8)

    const timeResponse = await fetch(`${supabaseUrl}/rest/v1/time_entries`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        clock_in: clockIn.toISOString(),
        clock_out: clockOut.toISOString(),
        latitude: 40.7128,
        longitude: -74.0060,
        hours_worked: 8.0,
        approval_status: 'approved',
      }),
    })

    if (!timeResponse.ok) {
      const timeData = await timeResponse.json()
      console.error('Time entry insert failed:', timeData)
      return Response.json({ error: 'Failed to create time entry', details: timeData }, { status: 400 })
    }

    console.log('✅ Time entry created')

    // Step 3: Insert payroll
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() - 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const payResponse = await fetch(`${supabaseUrl}/rest/v1/payroll`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        week_ending: weekEndStr,
        total_hours: 24,
        hourly_rate: 25,
        total_amount: 600,
        status: 'pending',
      }),
    })

    if (!payResponse.ok) {
      const payData = await payResponse.json()
      console.error('Payroll insert failed:', payData)
      return Response.json({ error: 'Failed to create payroll', details: payData }, { status: 400 })
    }

    console.log('✅ Payroll created')

    return Response.json({
      success: true,
      message: '🎉 Demo account fully seeded!',
      credentials: {
        email: 'demo@timeclok.test',
        password: 'DemoPass123!',
        url: 'https://timeclok.vercel.app',
      },
      data: {
        employee_id: employeeId,
        time_entry: '8 hours',
        payroll: '$600 pending',
      },
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
