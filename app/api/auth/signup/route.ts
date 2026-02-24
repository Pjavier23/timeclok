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

    // 5. Notify Pedro of new signup (fire-and-forget)
    const resendKey = process.env.RESEND_API_KEY
    const notifyEmail = process.env.NOTIFY_EMAIL || 'pedro@jastheshop.com'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'

    if (resendKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'TimeClok Alerts <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: `🔔 New customer: ${companyName} (${email})`,
          html: `<div style="font-family:sans-serif;padding:32px;background:#0f0f0f;color:#fff;border-radius:12px;">
            <h2 style="color:#00d9ff;margin:0 0 16px;">⏱ New TimeClok Customer!</h2>
            <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:16px;">
              <div style="font-size:1.1rem;font-weight:700;color:#fff;">${companyName}</div>
              <div style="color:#999;margin-top:4px;">${email}</div>
              <div style="color:#666;font-size:0.8rem;margin-top:4px;">${new Date().toLocaleString()}</div>
            </div>
            <a href="${appUrl}/admin" style="display:inline-block;background:#00d9ff;color:#000;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;">View Admin Dashboard →</a>
          </div>`,
        }),
      }).catch(() => {}) // don't block signup if notification fails
    }

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
