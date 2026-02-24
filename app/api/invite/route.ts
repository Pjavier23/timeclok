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

    const { email, name } = await request.json()
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 })

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
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'}/join?company=${userData.company_id}&email=${encodeURIComponent(email)}`

    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      // No email service yet — return the link so owner can share manually
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: 'Email service not configured. Share this link manually.',
      })
    }

    // Send the invite email via Resend
    const emailHtml = buildInviteEmail({ companyName, inviteUrl, recipientName: name || email.split('@')[0] })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
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
      // Still return the link even if email fails
      return Response.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: `Couldn't send email automatically. Share this link: ${inviteUrl}`,
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
  <title>You're invited to join ${companyName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="font-size:28px;font-weight:900;color:#00d9ff;letter-spacing:-0.5px;">⏱ TimeClok</div>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#1a1a1a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px;overflow:hidden;">

              <!-- Greeting -->
              <p style="margin:0 0 8px 0;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">YOU'VE BEEN INVITED</p>
              <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">
                Join ${companyName}<br/>on TimeClok
              </h1>
              <p style="margin:0 0 32px 0;font-size:16px;color:#999;line-height:1.6;">
                Hey ${recipientName}, you've been invited to track your time and manage your earnings on TimeClok. It takes less than a minute to get started.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td style="background:#00d9ff;border-radius:10px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#000;text-decoration:none;letter-spacing:0.01em;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you get -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:rgba(0,217,255,0.05);border:1px solid rgba(0,217,255,0.1);border-radius:10px;padding:24px;">
                    <p style="margin:0 0 16px 0;font-size:13px;color:#00d9ff;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">What you'll be able to do</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;font-size:14px;color:#ccc;">✅ &nbsp;Clock in &amp; out from any device</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#ccc;">✅ &nbsp;Track your hours and earnings in real time</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#ccc;">✅ &nbsp;Set aside tax reserves automatically</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#ccc;">✅ &nbsp;Export your earnings reports anytime</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
                Button not working? Paste this link into your browser:<br/>
                <a href="${inviteUrl}" style="color:#00d9ff;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0 0;">
              <p style="margin:0;font-size:12px;color:#444;">
                Sent by TimeClok · If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
