// Supabase calls this webhook whenever a new user signs up
// Set it up in: Supabase Dashboard → Database → Webhooks → Create new webhook
// Table: auth.users | Event: INSERT | URL: https://timeclok.vercel.app/api/webhooks/signup

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'

function welcomeEmailHtml(email: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to TimeClok</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:28px;">⏱</span>
      <span style="font-size:24px;font-weight:900;color:#00b4d8;margin-left:8px;">TimeClok</span>
    </div>
    <div style="background:#1a1a1a;border:1px solid rgba(0,180,216,0.2);border-radius:16px;padding:40px;margin-bottom:24px;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;">Welcome to TimeClok! 🎉</h1>
      <p style="color:#888;font-size:16px;line-height:1.7;margin:0 0 24px;">
        You're in! TimeClok is the easiest way to track employee hours, manage contractors, and run payroll automatically — all in one place.
      </p>
      <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="color:#00b4d8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Get started in 3 steps</div>
        <div style="margin-bottom:12px;display:flex;gap:12px;">
          <span style="background:rgba(0,180,216,0.15);color:#00b4d8;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex-shrink:0;">1</span>
          <div><strong style="color:#fff;font-size:14px;">Set up your company</strong><br/><span style="color:#666;font-size:13px;">Add your business name and location</span></div>
        </div>
        <div style="margin-bottom:12px;display:flex;gap:12px;">
          <span style="background:rgba(34,197,94,0.15);color:#22c55e;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex-shrink:0;">2</span>
          <div><strong style="color:#fff;font-size:14px;">Invite your employees</strong><br/><span style="color:#666;font-size:13px;">They get a magic link to clock in from their phone</span></div>
        </div>
        <div style="display:flex;gap:12px;">
          <span style="background:rgba(245,158,11,0.15);color:#f59e0b;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex-shrink:0;">3</span>
          <div><strong style="color:#fff;font-size:14px;">Approve payroll</strong><br/><span style="color:#666;font-size:13px;">Hours are auto-calculated — you just approve</span></div>
        </div>
      </div>
      <a href="${appUrl}/owner/dashboard" style="display:block;text-align:center;background:#00b4d8;color:#000;padding:16px 32px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;">
        Go to Your Dashboard →
      </a>
    </div>
    <div style="text-align:center;color:#444;font-size:12px;">
      <p style="margin:0 0 8px;">You signed up at <a href="${appUrl}" style="color:#00b4d8;text-decoration:none;">timeclok.vercel.app</a></p>
      <p style="margin:0;">© 2026 TimeClok. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    // Verify webhook secret (set WEBHOOK_SECRET in Vercel env vars)
    const secret = request.headers.get('x-webhook-secret')
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Supabase sends the new row in body.record
    const newUser = body.record || body
    const email = newUser.email
    const createdAt = newUser.created_at || new Date().toISOString()
    const userId = newUser.id || 'unknown'

    if (!email) {
      return Response.json({ ok: true, skipped: 'no email' })
    }

    // Skip test accounts
    const isTest = email.includes('@test.com') || email.includes('@example.com') || email.includes('test_')
    if (isTest) {
      return Response.json({ ok: true, skipped: 'test account' })
    }

    const formattedTime = new Date(createdAt).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.vercel.app'
    const resendKey = process.env.RESEND_API_KEY || 're_fBF6MpTJ_2KrA33vWATsgQdt7m8UfKaVP'

    // === Insert into drip_emails for the email sequence ===
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      await supabase.from('drip_emails').upsert({
        user_id: userId !== 'unknown' ? userId : undefined,
        email,
        day2_sent: false,
        day7_sent: false,
        signed_up_at: createdAt,
      }, { onConflict: 'email' })
    } catch (dripErr) {
      console.error('drip_emails insert error:', dripErr)
      // Non-fatal — continue
    }

    // === Welcome Email to new user ===
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TimeClok <onboarding@resend.dev>',
          to: [email],
          subject: 'Welcome to TimeClok! ⏱ Let\'s get your team clocked in',
          html: welcomeEmailHtml(email),
        }),
      })
    }

    // === Telegram Notification ===
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramToken && telegramChatId) {
      const msg = `🔔 *New TimeClok Signup!*\n\n📧 ${email}\n🕐 ${formattedTime} ET\n🆔 \`${userId}\`\n\n👉 [View Admin](${appUrl}/admin)`
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: msg,
          parse_mode: 'Markdown',
        }),
      })
    }

    // === Admin Notification Email ===
    const notifyEmail = process.env.NOTIFY_EMAIL || 'pedro@jastheshop.com'

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TimeClok Alerts <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: `🔔 New signup: ${email}`,
          html: `
            <div style="font-family:sans-serif;background:#0f0f0f;padding:40px;color:#fff;border-radius:12px;">
              <h2 style="color:#00b4d8;margin:0 0 16px;">⏱ New TimeClok Signup</h2>
              <p style="color:#ccc;margin:0 0 8px;">Someone just signed up for TimeClok!</p>
              <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
                <div style="font-size:1.1rem;font-weight:700;">${email}</div>
                <div style="color:#666;font-size:0.875rem;margin-top:4px;">${formattedTime} ET</div>
                <div style="color:#555;font-size:0.8rem;margin-top:4px;">ID: ${userId}</div>
              </div>
              <p style="color:#666;font-size:0.875rem;">Welcome email + drip sequence started automatically.</p>
              <a href="${appUrl}/admin" style="display:inline-block;background:#00b4d8;color:#000;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;">
                View Admin Dashboard →
              </a>
            </div>
          `,
        }),
      })
    }

    console.log(`New signup: ${email} at ${createdAt}`)
    return Response.json({ ok: true, telegram: !!telegramToken, email: !!resendKey, drip: true })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
