import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Hardcoded service role key as fallback
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'

// Pre-shared admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'timeclok-setup-2024'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, email, password, companyName, ownerName } = body

    // Verify admin token
    if (token !== ADMIN_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || !password || !companyName) {
      return Response.json(
        { error: 'Email, password, and company name required' },
        { status: 400 }
      )
    }

    console.log('Creating account with Supabase...')
    console.log('URL:', supabaseUrl)
    console.log('Key exists:', !!SERVICE_ROLE_KEY)

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Test the connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('count(*)')
      .limit(1)

    console.log('Connection test:', testError ? 'FAILED' : 'OK')

    if (testError) {
      console.error('Connection test error:', testError)
      throw new Error('Failed to connect to database: ' + testError.message)
    }

    // Create auth user
    console.log('Creating auth user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        companyName,
        ownerName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Failed to create user: ' + authError.message)
    }

    if (!authData.user) {
      throw new Error('User creation returned no user ID')
    }

    const userId = authData.user.id
    console.log('User created:', userId)

    // Create user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          full_name: ownerName || companyName,
          user_type: 'owner',
          company_id: null,
        },
      ])

    if (userError && userError.code !== '23505') {
      console.warn('User profile warning:', userError)
    }

    // Create company
    const { data: companyData, error: compError } = await supabaseAdmin
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError) {
      console.error('Company error:', compError)
      throw new Error('Failed to create company: ' + compError.message)
    }

    // Update user with company_id
    await supabaseAdmin
      .from('users')
      .update({ company_id: companyData.id })
      .eq('id', userId)

    return Response.json(
      {
        success: true,
        message: 'Business account created successfully!',
        account: {
          email,
          password,
          companyName,
          loginUrl: 'https://timeclok.vercel.app/auth/login',
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Full error:', err)
    return Response.json(
      { error: err.message || 'Failed to create account' },
      { status: 400 }
    )
  }
}
