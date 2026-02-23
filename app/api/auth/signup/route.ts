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
    
    let supabase: any
    let authData: any
    let userId: string | null = null
    
    // Always try admin API first if we have service role key
    if (serviceRoleKey) {
      console.log('Using admin API for auto-confirmed signup')
      supabase = createClient(supabaseUrl, serviceRoleKey)
      
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so they can login immediately
      })
      
      if (error) {
        console.error('Admin signup failed:', error.message)
        throw error
      }
      
      authData = { user: data.user, session: null }
      userId = data.user.id
    } else {
      // Fallback to standard signup
      console.log('Using standard signup')
      supabase = createClient(supabaseUrl, anonKey)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      authData = data
      userId = data.user?.id
    }

    if (!authData.user || !userId) throw new Error('Signup failed')

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
        .insert([{ name: companyName, owner_id: userId }])
        .select()
        .single()
      
      companyId = companyData?.id || null
      
      // Update user with company_id
      if (companyId) {
        await supabase
          .from('users')
          .update({ company_id: companyId })
          .eq('id', userId)
        
        // Auto-seed sample data for immediate onboarding
        try {
          console.log('Seeding sample data...')
          const seedRes = await fetch(`${request.headers.get('origin') || 'https://timeclok.vercel.app'}/api/seed-company`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              ownerId: userId,
            }),
          })
          console.log('Seed response:', seedRes.status)
        } catch (e) {
          console.warn('Seed failed (non-blocking):', e)
        }
      }
    }

    return Response.json({
      user: authData.user,
      session: authData.session,
      companyId,
      message: 'Signup successful! Your dashboard is ready with sample data.'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
