import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'

    if (!supabaseUrl) {
      return Response.json({ error: 'Missing SUPABASE_URL' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create user profile
    await supabase
      .from('users')
      .insert([{
        id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        email: 'demo@timeclok.test',
        full_name: 'Demo Owner',
        user_type: 'owner',
        created_at: new Date(),
        updated_at: new Date(),
      }])
      .on('*', (payload) => console.log(payload))

    // Create company
    await supabase
      .from('companies')
      .insert([{
        id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        name: 'Demo Company',
        owner_id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        created_at: new Date(),
      }])

    // Update user with company
    await supabase
      .from('users')
      .update({ company_id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff' })
      .eq('id', 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff')

    // Create employee user
    await supabase
      .from('users')
      .insert([{
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        email: 'john.doe@company.com',
        full_name: 'John Doe',
        user_type: 'employee',
        company_id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        created_at: new Date(),
        updated_at: new Date(),
      }])

    // Create employee record
    const { data: empData } = await supabase
      .from('employees')
      .insert([{
        user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        company_id: 'dd1ce5d9-c752-430e-b931-b00ec2d1d3ff',
        hourly_rate: 25.00,
        employee_type: 'contractor',
        created_at: new Date(),
      }])
      .select()
      .single()

    // Create time entry
    if (empData) {
      const clockInTime = new Date()
      clockInTime.setDate(clockInTime.getDate() - 3)
      const clockOutTime = new Date(clockInTime)
      clockOutTime.setHours(clockOutTime.getHours() + 8)

      await supabase
        .from('time_entries')
        .insert([{
          employee_id: empData.id,
          clock_in: clockInTime.toISOString(),
          clock_out: clockOutTime.toISOString(),
          latitude: 40.7128,
          longitude: -74.0060,
          hours_worked: 8.0,
          approval_status: 'approved',
          created_at: new Date(),
        }])

      // Create payroll
      const weekEnding = new Date()
      weekEnding.setDate(weekEnding.getDate() - 7)
      
      await supabase
        .from('payroll')
        .insert([{
          employee_id: empData.id,
          week_ending: weekEnding.toISOString().split('T')[0],
          total_hours: 24.00,
          hourly_rate: 25.00,
          total_amount: 600.00,
          status: 'pending',
          created_at: new Date(),
        }])
    }

    return Response.json({
      message: '✅ Demo account created!',
      credentials: {
        email: 'demo@timeclok.test',
        password: 'DemoPass123!',
      },
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
