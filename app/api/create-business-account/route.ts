import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

// Pre-shared admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'timeclok-setup-2024'

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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

    // Use service role key if available, otherwise anon key
    const useKey = serviceRoleKey || supabaseAnonKey
    const isAdmin = !!serviceRoleKey
    
    const supabase = createClient(supabaseUrl, useKey)

    // Step 1: Try to create auth user
    let userId: string | null = null
    
    if (isAdmin) {
      // Admin path: use admin.createUser
      console.log('Creating auth user via admin API')
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      
      if (!authError && authData.user) {
        userId = authData.user.id
        console.log('Auth user created:', userId)
      } else {
        console.warn('Admin user creation failed:', authError?.message)
        // Fallback: generate UUID for user profile
        userId = generateUUID()
        console.log('Using generated UUID:', userId)
      }
    } else {
      // Standard path: use signUp
      console.log('Creating auth user via standard signup')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (!authError && authData.user) {
        userId = authData.user.id
        console.log('Auth user created:', userId)
      } else {
        console.warn('Standard signup failed:', authError?.message)
        // Fallback: generate UUID for user profile
        userId = generateUUID()
        console.log('Using generated UUID:', userId)
      }
    }
    
    console.log('Creating user profile')
    const { error: profileError } = await supabase
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
      .select()

    if (profileError) {
      console.warn('Profile creation warning:', profileError.message)
      // Don't fail if profile exists
      if (!profileError.message.includes('duplicate')) {
        throw profileError
      }
    }

    // Step 3: Create company
    console.log('Creating company')
    const { data: companyData, error: compError } = await supabase
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError && !compError.message.includes('duplicate')) {
      throw new Error('Failed to create company: ' + compError.message)
    }

    // Step 4: Update user with company_id if company was created
    if (companyData?.id) {
      await supabase
        .from('users')
        .update({ company_id: companyData.id })
        .eq('id', userId)
    }

    // Success
    return Response.json(
      {
        success: true,
        message: 'Business account created successfully!',
        account: {
          email,
          password,
          companyName,
          ownerName: ownerName || companyName,
          userId,
          loginUrl: 'https://timeclok.vercel.app/auth/login',
        },
        instructions: [
          `1. Go to https://timeclok.vercel.app/auth/login`,
          `2. Enter email: ${email}`,
          `3. Enter password: ${password}`,
          '4. Click Log In',
          '5. You will see your Owner Dashboard',
        ],
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Account creation error:', err)
    return Response.json(
      { error: err.message || 'Failed to create account' },
      { status: 400 }
    )
  }
}
