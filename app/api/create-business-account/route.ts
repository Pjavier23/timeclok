import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

    if (!serviceRoleKey) {
      return Response.json(
        { error: 'Service role key not configured in environment', debug: { hasKey: !!serviceRoleKey } },
        { status: 500 }
      )
    }

    // Step 1: Create user via Supabase Admin API (bypasses email rate limiting)
    console.log('Creating auth user via Admin API:', email)
    const adminApiUrl = `${supabaseUrl}/auth/v1/admin/users`
    console.log('Admin URL:', adminApiUrl)
    console.log('Service key from env:', serviceRoleKey ? `[${serviceRoleKey.length} chars, starts: ${serviceRoleKey.substring(0, 15)}...]` : 'EMPTY')
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    }
    
    const createUserResponse = await fetch(adminApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      }),
    })

    const responseText = await createUserResponse.text()
    console.log('Admin API response status:', createUserResponse.status)
    console.log('Admin API response ok:', createUserResponse.ok)
    console.log('Admin API response text:', responseText)

    if (!createUserResponse.ok) {
      let error
      try {
        error = JSON.parse(responseText)
      } catch {
        error = { message: responseText }
      }
      console.error('Admin API error:', error)
      return Response.json(
        {
          error: error.message || error.hint || 'Failed to create user',
          debug: {
            serviceKeyExists: !!serviceRoleKey,
            serviceKeyLength: serviceRoleKey.length,
            serviceKeyStart: serviceRoleKey.substring(0, 20),
            supabaseUrl,
            adminUrl: adminApiUrl
          }
        },
        { status: 400 }
      )
    }

    let authData
    try {
      authData = JSON.parse(responseText)
    } catch (e) {
      return Response.json(
        {
          error: 'Failed to parse API response',
          debug: { responseText, parseError: String(e) }
        },
        { status: 400 }
      )
    }

    const userId = authData.id
    console.log('Auth user created:', userId)

    // Step 2: Create user profile using Supabase client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
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
