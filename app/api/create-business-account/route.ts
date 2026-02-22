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

    // Use anon key for signup (works without rate limits after Pro upgrade)
    const supabase = createClient(supabaseUrl, anonKey)

    // Step 1: Sign up user (this works with Pro tier)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
          owner_name: ownerName,
        },
      },
    })

    if (authError) {
      throw new Error(authError.message || 'Signup failed')
    }

    if (!authData.user) {
      throw new Error('Account creation failed')
    }

    // Step 2: Sign in immediately to get session
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      console.warn('Login after signup:', loginError)
      // Continue anyway - user can login manually
    }

    const userId = authData.user.id

    // Return success
    return Response.json(
      {
        success: true,
        message: 'Business account created successfully!',
        account: {
          email,
          password,
          companyName,
          ownerName: ownerName || companyName,
          loginUrl: 'https://timeclok.vercel.app/auth/login',
        },
        instructions: [
          `Go to https://timeclok.vercel.app/auth/login`,
          `Enter email: ${email}`,
          `Enter password: ${password}`,
          'You will see the Owner Dashboard',
          'Click "Add Employee" to invite your team',
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
