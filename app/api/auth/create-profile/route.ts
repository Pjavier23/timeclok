import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

export async function POST(request: Request) {
  try {
    const { userId, email, fullName, userType, companyId } = await request.json()

    if (!userId || !email) {
      return Response.json({ error: 'userId and email required' }, { status: 400 })
    }

    if (!serviceRoleKey) {
      return Response.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Insert user profile
    const { error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email,
          full_name: fullName || email,
          user_type: userType || 'owner',
          company_id: companyId || null,
        },
      ])
      .select()

    if (error && !error.message.includes('duplicate')) {
      console.error('Profile creation error:', error)
      throw error
    }

    return Response.json({ success: true, message: 'Profile created' }, { status: 201 })
  } catch (err: any) {
    console.error('Error:', err)
    return Response.json({ error: err.message || 'Failed to create profile' }, { status: 400 })
  }
}
