import { getUserFromToken, createServiceClient } from '../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const { email, name, phone, method = 'email' } = await request.json()

    if (method === 'email' && !email) return Response.json({ error: 'Email is required' }, { status: 400 })
    if (method === 'sms' && !phone) return Response.json({ error: 'Phone number is required' }, { status: 400 })

    const supabase = createServiceClient()

    // Get owner's company info
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, company_id, companies(name)')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'No company found for this account' }, { status: 400 })
    }

    const companyName = (userData as any).companies?.name || 'Your Company'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.com'

    // ── SMS via Twilio ──────────────────────────────────────────────
    if (method === 'sms') {
      const inviteUrl = `${baseUrl}/join?company=${userData.company_id}&phone=${encodeURIComponent(phone)}`
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authTokenVal = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER

      if (!accountSid || !authTokenVal || !fromNumber) {
        return Response.json({
          success: true,
          smsSent: false,
          inviteUrl,
          message: 'SMS service not configured. Share this link manually.',
        })
      }

      const body = `${name || 'Hi'}, you've been invited to join ${companyName} on TimeClok! Click here to get started: ${inviteUrl}`
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authTokenVal}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: phone, From: fromNumber, Body: body }).toString(),
        }
      )
      const twilioData = await twilioRes.json()
      if (!twilioRes.ok || twilioData.error_code) {
        return Response.json({ success: true, smsSent: false, inviteUrl, message: `SMS failed. Share this link manually.` })
      }
      return Response.json({ success: true, smsSent: true, inviteUrl, message: `Invite SMS sent to ${phone}!` })
    }

    // ── Email via Supabase Auth Invite ─────────────────────────────
    // The redirect takes them to a page where they set their password
    const redirectTo = `${baseUrl}/auth/set-password?company=${userData.company_id}&name=${encodeURIComponent(name || '')}`

    // Check if this employee is already in the users table (already enrolled)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('company_id', userData.company_id)
      .single()

    if (existingUser) {
      // Already enrolled — send a password reset / re-access link
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
      })

      if (resetErr) {
        console.error('Reset email error:', resetErr)
        return Response.json({
          success: true,
          emailSent: false,
          alreadyEnrolled: true,
          message: `${email} is already enrolled. Could not send re-access email — ask them to use "Forgot Password" on the login page.`,
        })
      }

      return Response.json({
        success: true,
        emailSent: true,
        alreadyEnrolled: true,
        message: `${email} is already enrolled. A login/reset link has been emailed to them.`,
      })
    }

    // New employee — invite via Supabase (sends email automatically)
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        company_id: userData.company_id,
        invited_by: user.id,
        full_name: name || '',
      },
    })

    if (inviteErr) {
      // User exists in auth but not in our users table — still send password reset
      if (inviteErr.message?.toLowerCase().includes('already') || inviteErr.message?.toLowerCase().includes('exist')) {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl}/auth/reset-password` })
        return Response.json({
          success: true,
          emailSent: true,
          message: `Invite sent to ${email}! They'll receive an email to set up their account.`,
        })
      }

      console.error('Invite error:', inviteErr)
      // Fallback: generate manual link
      const manualUrl = `${baseUrl}/join?company=${userData.company_id}&email=${encodeURIComponent(email)}`
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl: manualUrl,
        message: `Email could not be sent automatically. Share this link manually with ${email}.`,
      })
    }

    return Response.json({
      success: true,
      emailSent: true,
      message: `Invite sent to ${email}! They'll receive an email to create their password and join ${companyName}.`,
    })
  } catch (err: any) {
    console.error('Invite error:', err)
    return Response.json({ error: err.message || 'Failed to send invite' }, { status: 500 })
  }
}
