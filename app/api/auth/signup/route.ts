import { createServiceClient } from '../../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, password, companyName } = await request.json()

    if (!email || !password || !companyName) {
      return Response.json({ error: 'Email, password, and company name are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Create auth user (email_confirm: true skips email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Insert owner into public.users (without company_id first)
    const { error: userError } = await supabase.from('users').insert([{
      id: userId,
      email,
      full_name: companyName,
      user_type: 'owner',
    }])

    if (userError) {
      console.error('User profile error:', userError)
    }

    // 3. Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (companyError) {
      console.error('Company error:', companyError)
      return Response.json({ error: 'Failed to create company: ' + companyError.message }, { status: 500 })
    }

    // 4. Update user with company_id
    await supabase
      .from('users')
      .update({ company_id: company.id })
      .eq('id', userId)

    return Response.json({
      success: true,
      message: 'Account created. You can now log in.',
      companyId: company.id,
    })
  } catch (err: any) {
    console.error('Signup error:', err)
    return Response.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}
