import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, userType, companyName } = body

    // Validate
    if (!email || !password || !userType) {
      return Response.json(
        { error: 'Email, password, and user type required' },
        { status: 400 }
      )
    }

    if (userType === 'owner' && !companyName) {
      return Response.json(
        { error: 'Company name required for owners' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Sign up - this creates auth.users record
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      // Parse Supabase error messages
      let errorMsg = signUpError.message

      if (errorMsg.includes('already registered')) {
        errorMsg = 'Email already registered. Please log in.'
      } else if (errorMsg.includes('rate limit')) {
        errorMsg = 'Too many signup attempts. Please wait a few minutes.'
      } else if (errorMsg.includes('password')) {
        errorMsg = 'Password too weak. Use uppercase, numbers, and symbols.'
      }

      return Response.json(
        { error: errorMsg },
        { status: 400 }
      )
    }

    if (!data.user) {
      return Response.json(
        { error: 'Account creation failed' },
        { status: 400 }
      )
    }

    // Return success - dashboard will handle creating user profile on first visit
    return Response.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          userType,
          companyName,
        },
        message: 'Account created! Check your email to confirm.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Signup error:', err)
    return Response.json(
      { error: 'Signup failed. Please try again.' },
      { status: 400 }
    )
  }
}
