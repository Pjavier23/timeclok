import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password, companyName, userType } = await request.json()

    if (!email || !password || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use the Supabase client with anon key - works with Pro tier without rate limits
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DStZYSJl03dZY_k-aIWAJA_UJC28eh_'
    const supabase = createClient(supabaseUrl, anonKey)

    // Create auth user using signUp (works with Pro tier)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id
    let companyData = null

    if (userType === 'owner') {
      // Create user profile for owner FIRST (before company, to avoid FK constraint)
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          full_name: companyName + ' Owner',
          user_type: 'owner',
          company_id: null, // Will update after company creation
        }])

      if (userError && userError.code !== '23505') throw userError

      // Now create company for owner
      const { data: newCompanyData, error: compError } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: userId }])
        .select()
        .single()

      if (compError) throw compError
      companyData = newCompanyData

      // Update user profile with company_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ company_id: companyData.id })
        .eq('id', userId)

      if (updateError) throw updateError
    } else {
      // Create user profile for employee
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          full_name: email.split('@')[0],
          user_type: 'employee',
        }])

      if (userError && userError.code !== '23505') throw userError

      // Create employee record
      const { error: empError } = await supabase
        .from('employees')
        .insert([{
          user_id: userId,
          hourly_rate: 25,
          employee_type: 'contractor',
        }])

      if (empError && empError.code !== '23505') throw empError
    }

    return Response.json({
      user: authData.user,
      company: companyData,
      message: 'Signup successful'
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
