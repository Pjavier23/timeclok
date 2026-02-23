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
    console.log('Signing up user:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('Signup failed')

    const userId = data.user.id
    console.log('User created:', userId)

    // Create company if name provided
    let companyId: string | null = null
    if (companyName) {
      const { data: companyData } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: userId }])
        .select()
        .single()
      
      companyId = companyData?.id || null
      console.log('Company created:', companyId)
    }

    return Response.json({
      success: true,
      user: data.user,
      session: data.session,
      companyId,
      message: 'Account created successfully. You can now log in.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
