import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password, companyName } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co').trim()
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    
    const supabase = createClient(supabaseUrl, anonKey)

    // Sign up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) throw signUpError
    if (!authData.user) throw new Error('Signup failed')

    // Create company if name provided
    let companyId: string | null = null
    if (companyName) {
      const { data: companyData } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: authData.user.id }])
        .select()
        .single()
      
      companyId = companyData?.id || null
    }

    return Response.json({
      user: authData.user,
      session: authData.session,
      companyId,
      message: 'Signup successful. Please check your email to confirm your account.'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
