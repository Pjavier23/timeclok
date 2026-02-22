import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, userType, companyName } = body

    // Validate
    if (!email || !password || !userType) {
      return Response.json(
        { error: 'Email, password, and user type are required' },
        { status: 400 }
      )
    }

    if (userType === 'owner' && !companyName) {
      return Response.json(
        { error: 'Company name is required for owners' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create client with anon key
    const supabase = createClient(supabaseUrl, anonKey)

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : supabaseUrl,
      },
    })

    if (authError) {
      // Handle specific errors
      if (authError.message.includes('already registered')) {
        return Response.json(
          { error: 'This email is already registered. Please log in instead.' },
          { status: 400 }
        )
      }
      if (authError.message.includes('Password should be different')) {
        return Response.json(
          { error: 'Password is too simple. Use a stronger password.' },
          { status: 400 }
        )
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned')
    }

    const userId = authData.user.id

    // Create session for immediate login
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) {
      console.warn('Session creation warning:', sessionError)
      // Continue anyway - user can login manually
    }

    return Response.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          userType,
        },
        message: 'Account created successfully! You can now sign in.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Registration error:', err)
    const errorMessage = err.message || err.error_description || 'Registration failed. Please try again.'
    return Response.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
