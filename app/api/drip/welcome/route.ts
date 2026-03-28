// Welcome email drip — Email 1
// Called immediately on signup (also via webhooks/signup)
// POST body: { email: string, userId?: string }

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_fBF6MpTJ_2KrA33vWATsgQdt7m8UfKaVP'
const APP_URL = 'https://timeclok.vercel.app'

function welcomeEmailHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to TimeClok</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <span style="font-size:28px;">⏱</span>
        <span style="font-size:24px;font-weight:900;color:#00b4d8;">TimeClok</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1a1a1a;border:1px solid rgba(0,180,216,0.2);border-radius:16px;padding:40px;margin-bottom:24px;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;">
        Welcome to TimeClok! 🎉
      </h1>
      <p style="color:#888;font-size:16px;line-height:1.7;margin:0 0 24px;">
        You're in! TimeClok is the easiest way to track employee hours, manage contractors, and run payroll automatically — all in one place.
      </p>

      <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="color:#00b4d8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Get started in 3 steps</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:28px;height:28px;background:rgba(0,180,216,0.15);border:1px solid rgba(0,180,216,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:900;color:#00b4d8;">1</div>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">Set up your company</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">Add your business name and location</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:28px;height:28px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:900;color:#22c55e;">2</div>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">Invite your employees</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">They get a link to clock in from their phone</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:28px;height:28px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:900;color:#f59e0b;">3</div>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">Approve payroll</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">Hours are auto-calculated — you just approve</div>
            </div>
          </div>
        </div>
      </div>

      <a href="${APP_URL}/owner/dashboard" style="display:block;text-align:center;background:#00b4d8;color:#000;padding:16px 32px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;letter-spacing:-0.01em;">
        Go to Your Dashboard →
      </a>
    </div>

    <!-- Features row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:#1a1a1a;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:20px;margin-bottom:8px;">📍</div>
        <div style="color:#fff;font-size:12px;font-weight:700;">GPS Tracking</div>
      </div>
      <div style="background:#1a1a1a;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:20px;margin-bottom:8px;">💰</div>
        <div style="color:#fff;font-size:12px;font-weight:700;">Auto Payroll</div>
      </div>
      <div style="background:#1a1a1a;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:20px;margin-bottom:8px;">📊</div>
        <div style="color:#fff;font-size:12px;font-weight:700;">CSV Export</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#444;font-size:12px;line-height:1.6;">
      <p style="margin:0 0 8px;">You're receiving this because you signed up at <a href="${APP_URL}" style="color:#00b4d8;text-decoration:none;">timeclok.vercel.app</a></p>
      <p style="margin:0;">© 2026 TimeClok. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, userId } = body

    if (!email) {
      return Response.json({ error: 'email required' }, { status: 400 })
    }

    // Send welcome email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TimeClok <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to TimeClok! ⏱ Let\'s get your team clocked in',
        html: welcomeEmailHtml(email),
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Resend error:', error)
      return Response.json({ error }, { status: 500 })
    }

    const data = await res.json()
    console.log(`Welcome email sent to ${email}:`, data.id)
    return Response.json({ ok: true, id: data.id })
  } catch (err: any) {
    console.error('Drip welcome error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
