import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: Request) {
  try {
    if (!serviceRoleKey) {
      return Response.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const email = 'pedro@jastheshop.com'
    const password = 'DemoOwner2024!'
    const companyName = 'Jastheshop Demo Company'

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        userType: 'owner',
        companyName,
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    const userId = authData.user.id

    // 2. Create user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          full_name: 'Pedro Javier',
          user_type: 'owner',
          company_id: null,
        },
      ])

    if (userError && userError.code !== '23505') {
      console.warn('User profile warning:', userError)
    }

    // 3. Create company
    const { data: companyData, error: compError } = await supabaseAdmin
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError) throw compError

    // 4. Update user with company_id
    await supabaseAdmin
      .from('users')
      .update({ company_id: companyData.id })
      .eq('id', userId)

    // 5. Create demo employees
    const employees = [
      { name: 'John Smith', email: 'john@jastheshop.com', rate: 25 },
      { name: 'Jane Doe', email: 'jane@jastheshop.com', rate: 28 },
      { name: 'Mike Johnson', email: 'mike@jastheshop.com', rate: 30 },
    ]

    for (const emp of employees) {
      // Create auth user for employee
      const { data: empAuth, error: empAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: emp.email,
        password: 'Employee2024!',
        email_confirm: true,
      })

      if (empAuthError) {
        console.warn(`Employee ${emp.name} auth error:`, empAuthError)
        continue
      }

      // Create employee record
      await supabaseAdmin.from('employees').insert([
        {
          user_id: empAuth.user.id,
          company_id: companyData.id,
          hourly_rate: emp.rate,
          employee_type: 'contractor',
        },
      ])

      // Create sample time entries
      const now = new Date()
      for (let i = 0; i < 5; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await supabaseAdmin.from('time_entries').insert([
          {
            employee_id: (
              await supabaseAdmin
                .from('employees')
                .select('id')
                .eq('user_id', empAuth.user.id)
                .single()
            ).data?.id,
            clock_in: new Date(date.setHours(9, 0, 0)).toISOString(),
            clock_out: new Date(date.setHours(17, 0, 0)).toISOString(),
            hours_worked: 8,
            latitude: 38.9072,
            longitude: -77.0369,
            approval_status: 'approved',
          },
        ])
      }
    }

    // 6. Create demo projects
    const { error: projectError } = await supabaseAdmin
      .from('projects')
      .insert([
        { company_id: companyData.id, name: 'Store Renovation', status: 'active' },
        { company_id: companyData.id, name: 'Summer Campaign', status: 'active' },
        { company_id: companyData.id, name: 'Website Redesign', status: 'completed' },
      ])

    if (projectError) console.warn('Project error:', projectError)

    return Response.json(
      {
        success: true,
        message: 'Demo account created successfully!',
        credentials: {
          email,
          password,
          url: 'https://timeclok.vercel.app/auth/login',
        },
        company: {
          name: companyName,
          owner: 'Pedro Javier',
          employees: employees.length,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Seed error:', err)
    return Response.json({ error: err.message || 'Seed failed' }, { status: 400 })
  }
}
