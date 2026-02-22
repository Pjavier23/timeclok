import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Pre-shared admin token
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

    if (!serviceRoleKey) {
      return Response.json(
        { error: 'Service role key not configured in environment', debug: { hasKey: !!serviceRoleKey } },
        { status: 500 }
      )
    }

    // Step 1: Try standard signup first to test connectivity
    console.log('Attempting user creation:', email)
    
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseStandard = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: authData, error: authError } = await supabaseStandard.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return Response.json(
        { error: authError.message || 'Failed to create user', details: authError },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return Response.json(
        { error: 'User creation returned no user data' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    // Step 2: Create user profile
    const supabase = supabaseStandard
    
    console.log('Creating user profile')
    const { error: profileError } = await supabase
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

    if (profileError) {
      console.warn('Profile creation warning:', profileError.message)
      // Don't fail if profile exists
      if (!profileError.message.includes('duplicate')) {
        throw profileError
      }
    }

    // Step 3: Create company
    console.log('Creating company')
    const { data: companyData, error: compError } = await supabase
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError && !compError.message.includes('duplicate')) {
      throw new Error('Failed to create company: ' + compError.message)
    }

    // Step 4: Update user with company_id if company was created
    if (companyData?.id) {
      await supabase
        .from('users')
        .update({ company_id: companyData.id })
        .eq('id', userId)
    }

    // Success
    return Response.json(
      {
        success: true,
        message: 'Business account created successfully!',
        account: {
          email,
          password,
          companyName,
          ownerName: ownerName || companyName,
          userId,
          loginUrl: 'https://timeclok.vercel.app/auth/login',
        },
        instructions: [
          `1. Go to https://timeclok.vercel.app/auth/login`,
          `2. Enter email: ${email}`,
          `3. Enter password: ${password}`,
          '4. Click Log In',
          '5. You will see your Owner Dashboard',
        ],
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Account creation error:', err)
    return Response.json(
      { error: err.message || 'Failed to create account' },
      { status: 400 }
    )
  }
}
