import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjczMTUsImV4cCI6MjA4NzM0MzMxNX0.9A8mB1gkW4TUBBIt8ybqsWQ6XXYLWQDLjENonRoGLMY'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, anonKey)

    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // If email not confirmed error, bypass it
      if (error.message.includes('Email not confirmed')) {
        // Try to refresh or update user confirmation status
        const { data: user, error: userError } = await supabase.auth.getUser()
        if (!userError) {
          return Response.json({
            success: false,
            error: 'Email not confirmed. Please confirm your email and try again.',
            email,
          })
        }
      }
      throw error
    }

    if (!data.session) {
      throw new Error('Login failed - no session returned')
    }

    return Response.json({
      success: true,
      session: data.session,
      user: data.user,
      accessToken: data.session.access_token,
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return Response.json(
      { error: err.message || 'Login failed' },
      { status: 400 }
    )
  }
}
