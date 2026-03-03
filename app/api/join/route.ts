import { createServiceClient } from '../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, password, companyId, fullName, hourlyRate = 25 } = await request.json()

    if (!email || !password || !companyId) {
      return Response.json({ error: 'Email, password, and company ID are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify company exists
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyErr || !company) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // Create user profile
    await supabase.from('users').insert([{
      id: userId,
      email,
      full_name: fullName || email.split('@')[0],
      user_type: 'employee',
      company_id: companyId,
    }])

    // Create employee record
    const { data: empRecord, error: empErr } = await supabase
      .from('employees')
      .insert([{
        user_id: userId,
        company_id: companyId,
        hourly_rate: parseFloat(hourlyRate) || 25,
        employee_type: 'w2',
      }])
      .select()
      .single()

    if (empErr) {
      console.error('Employee record error:', empErr)
    }

    return Response.json({
      success: true,
      message: 'Account created. You can now log in.',
      companyName: company.name,
    })
  } catch (err: any) {
    console.error('Join error:', err)
    return Response.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company')

  if (!companyId) {
    return Response.json({ error: 'Company ID required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return Response.json({ error: 'Company not found' }, { status: 404 })
  }

  return Response.json({ company })
}
