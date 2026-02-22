import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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

    // Use service role key for admin account creation (bypasses rate limits)
    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey)

    // Step 1: Sign up user via service role (bypasses email rate limiting)
    console.log('Creating auth user:', email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for fast onboarding
    })

    if (authError) {
      throw new Error(authError.message || 'Signup failed')
    }

    if (!authData.user) {
      throw new Error('Account creation failed')
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    // Step 2: Create user profile with service role key (RLS bypass for profile creation)
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
