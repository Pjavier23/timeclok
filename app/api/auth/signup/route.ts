import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password, companyName } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co').trim()
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    
    // Try to use admin API if service role key exists, otherwise use standard signup
    let supabase: any
    let authData: any
    
    if (serviceRoleKey) {
      // Admin path (no rate limiting)
      console.log('Using admin API for signup')
      supabase = createClient(supabaseUrl, serviceRoleKey)
      
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      
      if (error) throw error
      authData = { user: data.user, session: null }
    } else {
      // Standard path (may hit rate limits)
      console.log('Using standard signup')
      supabase = createClient(supabaseUrl, anonKey)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      authData = data
    }

    if (!authData.user) throw new Error('Signup failed')

    // Auto-create user profile
    const profileRes = await fetch(`${request.headers.get('origin') || 'https://timeclok.vercel.app'}/api/auth/create-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        email: authData.user.email,
        fullName: authData.user.user_metadata?.full_name || '',
        userType: 'owner',
        companyId: null,
      }),
    })
    
    console.log('Profile creation response:', profileRes.status)

    // Create company if name provided
    let companyId: string | null = null
    if (companyName) {
      const { data: companyData } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: authData.user.id }])
        .select()
        .single()
      
      companyId = companyData?.id || null
      
      // Update user with company_id
      if (companyId) {
        await supabase
          .from('users')
          .update({ company_id: companyId })
          .eq('id', authData.user.id)
      }
    }

    return Response.json({
      user: authData.user,
      session: authData.session,
      companyId,
      message: 'Signup successful!'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
