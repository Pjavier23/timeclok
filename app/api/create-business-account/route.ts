import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Pre-shared admin token for security
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'timeclok-setup-2024'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, email, password, companyName, ownerName } = body

    // Verify admin token
    if (token !== ADMIN_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || !password || !companyName) {
      return Response.json(
        { error: 'Email, password, and company name required' },
        { status: 400 }
      )
    }

    // Use service role key (has full access, bypasses auth rate limits)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Create auth user with service role (bypasses rate limits)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        companyName,
        ownerName,
        onboardingDate: new Date().toISOString(),
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(authError.message || 'Failed to create user')
    }

    if (!authData.user) {
      throw new Error('User creation returned no user')
    }

    const userId = authData.user.id

    // 2. Create user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          full_name: ownerName || companyName,
          user_type: 'owner',
          company_id: null,
        },
      ])
      .select()

    if (userError && userError.code !== '23505') {
      console.warn('User profile error:', userError)
    }

    // 3. Create company
    const { data: companyData, error: compError } = await supabaseAdmin
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError) {
      console.error('Company error:', compError)
      throw new Error('Failed to create company')
    }

    // 4. Update user with company_id
    await supabaseAdmin
      .from('users')
      .update({ company_id: companyData.id })
      .eq('id', userId)

    // 5. Create sample employees with time entries
    const sampleEmployees = [
      { name: 'Employee 1', email: `emp1-${Date.now()}@${email.split('@')[1]}`, rate: 25 },
      { name: 'Employee 2', email: `emp2-${Date.now()}@${email.split('@')[1]}`, rate: 28 },
      { name: 'Employee 3', email: `emp3-${Date.now()}@${email.split('@')[1]}`, rate: 30 },
    ]

    for (const emp of sampleEmployees) {
      // Create employee auth record
      const { data: empAuth, error: empAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: emp.email,
        password: 'TempEmployee2024!',
        email_confirm: true,
      })

      if (empAuthError) {
        console.warn(`Failed to create employee auth:`, empAuthError)
        continue
      }

      // Create employee record
      const { data: empRecord, error: empError } = await supabaseAdmin
        .from('employees')
        .insert([
          {
            user_id: empAuth.user.id,
            company_id: companyData.id,
            hourly_rate: emp.rate,
            employee_type: 'contractor',
          },
        ])
        .select()
        .single()

      if (empError) {
        console.warn(`Failed to create employee record:`, empError)
        continue
      }

      // Create 10 days of time entries
      for (let i = 0; i < 10; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(9, 0, 0)

        const clockOut = new Date(date)
        clockOut.setHours(17, 0, 0)

        await supabaseAdmin.from('time_entries').insert([
          {
            employee_id: empRecord.id,
            clock_in: date.toISOString(),
            clock_out: clockOut.toISOString(),
            hours_worked: 8,
            latitude: 40.7128,
            longitude: -74.006,
            approval_status: 'approved',
          },
        ])
      }
    }

    // 6. Create sample projects
    await supabaseAdmin.from('projects').insert([
      { company_id: companyData.id, name: 'Onboarding Project', status: 'active' },
      { company_id: companyData.id, name: 'Operations', status: 'active' },
    ])

    return Response.json(
      {
        success: true,
        message: 'Business account created successfully!',
        account: {
          email,
          password,
          companyName,
          ownerName: ownerName || companyName,
          employees: sampleEmployees.length,
          loginUrl: 'https://timeclok.vercel.app/auth/login',
        },
        instructions: {
          step1: `Go to https://timeclok.vercel.app/auth/login`,
          step2: `Enter email: ${email}`,
          step3: `Enter password: ${password}`,
          step4: 'You will be in the Owner Dashboard with 3 sample employees',
          step5: 'Invite your real team using the "Add Employee" button',
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Create account error:', err)
    return Response.json(
      { error: err.message || 'Failed to create account' },
      { status: 400 }
    )
  }
}
