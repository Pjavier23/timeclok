import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, userType, companyName } = body

    // Validate
    if (!email || !password || !userType) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (userType === 'owner' && !companyName) {
      return Response.json(
        { error: 'Company name required for owners' },
        { status: 400 }
      )
    }

    // Create Supabase admin client (uses service role key to bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id

    // 2. Create user profile in public.users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          full_name: companyName || email.split('@')[0],
          user_type: userType,
          company_id: null,
        },
      ])

    if (userError) throw userError

    // 3. If owner, create company
    if (userType === 'owner') {
      const { data: companyData, error: compError } = await supabaseAdmin
        .from('companies')
        .insert([
          {
            name: companyName,
            owner_id: userId,
          },
        ])
        .select()
        .single()

      if (compError) throw compError

      // Update user with company_id
      await supabaseAdmin
        .from('users')
        .update({ company_id: companyData.id })
        .eq('id', userId)
    }

    return Response.json(
      {
        success: true,
        user: { id: userId, email, userType },
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Registration error:', err)
    return Response.json(
      { error: err.message || 'Registration failed' },
      { status: 400 }
    )
  }
}
