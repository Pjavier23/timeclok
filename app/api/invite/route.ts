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
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : ''
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'}/join?company=${userData.company_id}${emailParam}`

    // ── SMS via Twilio ──────────────────────────────────────────────
    if (method === 'sms') {
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
        console.error('Twilio error:', twilioData)
        return Response.json({
          success: true,
          smsSent: false,
          inviteUrl,
          message: `SMS failed (${twilioData.message || 'unknown error'}). Share this link manually.`,
        })
      }

      return Response.json({
        success: true,
        smsSent: true,
        inviteUrl,
        message: `Invite SMS sent to ${phone}! They'll get a link to join.`,
      })
    }

    // ── Email via Resend ────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: 'Email service not configured. Share this link manually.',
      })
    }

    const emailHtml = buildInviteEmail({ companyName, inviteUrl, recipientName: name || email.split('@')[0] })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TimeClok <onboarding@resend.dev>',
        to: [email],
        subject: `You've been invited to join ${companyName} on TimeClok`,
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      console.error('Resend error:', err)
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: `Email failed. Share this link manually: ${inviteUrl}`,
      })
    }

    return Response.json({
      success: true,
      emailSent: true,
      inviteUrl,
      message: `Invite sent to ${email}! They'll get an email with a link to join.`,
    })
  } catch (err: any) {
    console.error('Invite error:', err)
    return Response.json({ error: err.message || 'Failed to send invite' }, { status: 500 })
  }
}

function buildInviteEmail({ companyName, inviteUrl, recipientName }: { companyName: string; inviteUrl: string; recipientName: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <div style="font-size:28px;font-weight:900;color:#00d9ff;">⏱ TimeClok</div>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">YOU'VE BEEN INVITED</p>
          <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:#fff;">Join ${companyName} on TimeClok</h1>
          <p style="margin:0 0 32px 0;font-size:16px;color:#999;line-height:1.6;">Hey ${recipientName}, you've been invited to track your time and manage your earnings. Takes less than a minute to get started.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
            <tr><td style="background:#00d9ff;border-radius:10px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#000;text-decoration:none;">Accept Invitation →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#555;">Button not working? <a href="${inviteUrl}" style="color:#00d9ff;">${inviteUrl}</a></p>
        </td></tr>
        <tr><td align="center" style="padding:24px 0 0 0;">
          <p style="margin:0;font-size:12px;color:#444;">Sent by TimeClok · If you weren't expecting this, ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
