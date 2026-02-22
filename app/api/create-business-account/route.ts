import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjczMTUsImV4cCI6MjA4NzM0MzMxNX0.9A8mB1gkW4TUBBIt8ybqsWQ6XXYLWQDLjENonRoGLMY'

// Pre-shared admin token
const ADMIN_TOKEN = 'timeclok-setup-2024'

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

    // Use anon key for signup
    const supabase = createClient(supabaseUrl, anonKey)

    // Step 1: Sign up user
    console.log('Creating auth user:', email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      throw new Error(authError.message || 'Signup failed')
    }

    if (!authData.user) {
      throw new Error('Account creation failed')
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    // Step 2: Sign in to get session
    console.log('Signing in user')
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) {
      console.warn('Session error:', sessionError)
      // Continue anyway
    }

    // Step 3: Create user profile with authenticated session
    if (sessionData?.session) {
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

      // Step 4: Create company
      console.log('Creating company')
      const { data: companyData, error: compError } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: userId }])
        .select()
        .single()

      if (compError && !compError.message.includes('duplicate')) {
        throw new Error('Failed to create company: ' + compError.message)
      }

      // Update user with company_id if company was created
      if (companyData?.id) {
        await supabase
          .from('users')
          .update({ company_id: companyData.id })
          .eq('id', userId)
      }
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
