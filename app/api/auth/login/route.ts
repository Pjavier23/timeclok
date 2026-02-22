import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabase = createClient(
      'https://tkljofxcndnwqyqrtrnx.supabase.co',
      'sb_publishable_DStZYSJI03dZY_k-all'
    )

    // Sign in with password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) throw signInError
    if (!data.user) throw new Error('Login failed')

    // Get user profile to determine role
    const { data: userProfile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', data.user.id)
      .single()

    return Response.json({
      user: data.user,
      userType: userProfile?.user_type || 'owner',
      session: data.session,
      message: 'Login successful'
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return Response.json({ error: error.message || 'Login failed' }, { status: 400 })
  }
}
