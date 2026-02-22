import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password, companyName, userType } = await request.json()

    if (!email || !password || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role key to bypass rate limiting
    const supabase = createClient(
      'https://tkljofxcndnwqyqrtrnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3l5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'
    )

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id

    if (userType === 'owner') {
      // Create company for owner
      const { data: companyData, error: compError } = await supabase
        .from('companies')
        .insert([{ name: companyName, owner_id: userId }])
        .select()
        .single()

      if (compError) throw compError

      // Create user profile for owner
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          full_name: companyName + ' Owner',
          user_type: 'owner',
          company_id: companyData.id,
        }])

      if (userError && userError.code !== '23505') throw userError
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
