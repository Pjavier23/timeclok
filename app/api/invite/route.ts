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

    // ── Email via Resend ───────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY
    const redirectTo = `${baseUrl}/auth/set-password?company=${userData.company_id}&name=${encodeURIComponent(name || '')}`

    // Check if already enrolled
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('company_id', userData.company_id)
      .single()

    if (existingUser) {
      // Already enrolled — send password reset link
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
      })

      if (resetErr) {
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

    // Generate the invite link via Supabase (creates the user + token, but does NOT send email)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        data: {
          company_id: userData.company_id,
          invited_by: user.id,
          full_name: name || '',
        },
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Generate link error:', linkErr)
      // Fallback: manual link
      const manualUrl = `${baseUrl}/join?company=${userData.company_id}&email=${encodeURIComponent(email)}`
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl: manualUrl,
        message: `Could not generate invite link. Share this link manually with ${email}.`,
      })
    }

    const inviteLink = linkData.properties.action_link

    // If no Resend key, fall back to manual link
    if (!resendKey) {
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl: inviteLink,
        message: `Email service not configured. Share this link manually with ${email}.`,
      })
    }

    // Send via Resend
    const employeeName = name || 'there'
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              ⏱ <span style="color:#00d9ff;">Time</span>Clok
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;">
              You're invited! 🎉
            </h1>
            <p style="margin:0 0 24px;font-size:16px;color:#555;line-height:1.6;">
              Hi ${employeeName}, <strong>${companyName}</strong> has invited you to join their team on TimeClok — the easy way to track your work hours and get paid accurately.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#00d9ff;border-radius:10px;">
                  <a href="${inviteLink}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#000000;text-decoration:none;">
                    Accept Invite &amp; Set Up Account →
                  </a>
                </td>
              </tr>
            </table>

            <!-- What to expect -->
            <div style="background:#f8f9fa;border-radius:10px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111;">What you can do with TimeClok:</p>
              <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
                <li>Clock in &amp; out from your phone</li>
                <li>Track your earnings in real time</li>
                <li>View your schedule &amp; shifts</li>
                <li>Download your pay statements</li>
              </ul>
            </div>

            <p style="margin:0 0 8px;font-size:13px;color:#999;">
              This invite link expires in 24 hours. If the button doesn't work, copy and paste this link:
            </p>
            <p style="margin:0;font-size:12px;color:#00d9ff;word-break:break-all;">
              <a href="${inviteLink}" style="color:#00d9ff;">${inviteLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#999;">
              Sent by TimeClok on behalf of ${companyName} · <a href="${baseUrl}" style="color:#00d9ff;text-decoration:none;">timeclok.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TimeClok <noreply@timeclok.com>',
        to: [email],
        subject: `You're invited to join ${companyName} on TimeClok ⏱`,
        html: emailHtml,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      // Still succeeded in generating the link — return it as fallback
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl: inviteLink,
        message: `Email delivery failed. Share this link manually with ${email}.`,
      })
    }

    return Response.json({
      success: true,
      emailSent: true,
      message: `Invite sent to ${email}! They'll receive a branded email to create their password and join ${companyName}.`,
    })
  } catch (err: any) {
    console.error('Invite error:', err)
    return Response.json({ error: err.message || 'Failed to send invite' }, { status: 500 })
  }
}
