import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co').trim()
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    
    console.log('Login - URL:', supabaseUrl)
    console.log('Login - Anon Key:', anonKey ? `${anonKey.substring(0, 20)}... (${anonKey.length} chars)` : 'EMPTY')
    
    if (!anonKey) {
      return Response.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, anonKey)

    // Sign in with password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('SignIn error:', signInError)
      throw signInError
    }
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
