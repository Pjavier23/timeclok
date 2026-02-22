import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjczMTUsImV4cCI6MjA4NzM0MzMxNX0.9A8mB1gkW4TUBBIt8ybqsWQ6XXYLWQDLjENonRoGLMY'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, anonKey)

    // Request a magic link that bypasses email confirmation
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://timeclok.vercel.app/owner/dashboard',
      },
    })

    if (error) {
      console.error('Magic link error:', error)
      // Return helpful message
      return Response.json({
        success: false,
        message: 'Check your email for a magic link. Click it to access your dashboard without a password.',
        error: error.message,
      })
    }

    return Response.json({
      success: true,
      message: 'Magic link sent! Check your email and click the link to login.',
      email,
    })
  } catch (err: any) {
    console.error('Magic link error:', err)
    return Response.json(
      { error: err.message || 'Failed to send magic link' },
      { status: 400 }
    )
  }
}
