import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

// Called after an invited employee sets their password on /auth/set-password
// Creates the user profile + employee record linked to the company
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const { companyId, fullName, email } = await request.json()

    if (!companyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
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

    // Upsert user profile (in case it already exists)
    const { error: userErr } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: email || user.email,
        full_name: fullName || (email || user.email || '').split('@')[0],
        user_type: 'employee',
        company_id: companyId,
      }, { onConflict: 'id' })

    if (userErr) {
      console.error('User upsert error:', userErr)
      // Non-fatal if duplicate
    }

    // Check if employee record already exists
    const { data: existingEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!existingEmp) {
      const { error: empErr } = await supabase
        .from('employees')
        .insert({
          user_id: user.id,
          company_id: companyId,
          hourly_rate: 25,
          employee_type: 'w2',
        })

      if (empErr) {
        console.error('Employee insert error:', empErr)
      }
    }

    // Update the auth user's display name
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: fullName },
    })

    return Response.json({
      success: true,
      message: 'Account setup complete.',
      companyName: company.name,
    })
  } catch (err: any) {
    console.error('Finalize error:', err)
    return Response.json({ error: err.message || 'Failed to complete setup' }, { status: 500 })
  }
}
