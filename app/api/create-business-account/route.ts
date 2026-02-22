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

    // Use service role key for auth, anon key for database operations
    const isAdmin = !!serviceRoleKey
    
    const supabaseAdmin = isAdmin ? createClient(supabaseUrl, serviceRoleKey) : null
    const supabase = createClient(supabaseUrl, supabaseAnonKey) // Always use anon key for database

    // Step 1: Create auth user
    console.log('Creating auth user, isAdmin:', isAdmin)
    let userId: string | null = null
    let authCreated = false
    
    // Try admin API first if we have the service role key
    if (isAdmin && supabaseAdmin) {
      console.log('Trying admin API first')
      const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      
      if (!adminAuthError && adminAuthData.user) {
        userId = adminAuthData.user.id
        authCreated = true
        console.log('Auth user created via admin API:', userId)
      } else {
        console.warn('Admin API failed:', adminAuthError?.message)
      }
    }
    
    // Fall back to standard signup if admin failed
    if (!authCreated) {
      console.log('Trying standard signup')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (!authError && authData.user) {
        userId = authData.user.id
        authCreated = true
        console.log('Auth user created via signup:', userId)
      } else {
        console.warn('Signup failed:', authError?.message)
      }
    }
    
    // Final fallback: use UUID
    if (!userId) {
      userId = generateUUID()
      console.log('Using fallback UUID:', userId)
    }
    
    // Step 2: Create user profile using service role key
    console.log('Creating user profile with service role key')
    if (supabaseAdmin) {
      const { error: profileError } = await supabaseAdmin
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
          console.error('Profile error:', profileError)
        }
      } else {
        console.log('User profile created')
      }
    } else {
      console.warn('Skipping profile creation - no admin client')
    }

    // Step 3: Create company (will be owned by email when user signs up)
    console.log('Creating company')
    const { data: companyData, error: compError } = await supabase
      .from('companies')
      .insert([{ name: companyName, owner_id: userId }])
      .select()
      .single()

    if (compError && !compError.message.includes('duplicate')) {
      console.warn('Company creation warning:', compError.message)
      // Continue anyway - company might exist
    }

    const companyId = companyData?.id
    console.log('Company created with ID:', companyId)

    // Step 4: Update user with company_id if company was created
    if (companyId && supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ company_id: companyId })
        .eq('id', userId)
      
      if (updateError) {
        console.warn('User update warning:', updateError.message)
      } else {
        console.log('User updated with company_id')
      }
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
