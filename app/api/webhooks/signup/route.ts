// Supabase calls this webhook whenever a new user signs up
// Set it up in: Supabase Dashboard → Database → Webhooks → Create new webhook
// Table: auth.users | Event: INSERT | URL: https://timeclok.vercel.app/api/webhooks/signup

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

    // === Telegram Notification ===
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (telegramToken && telegramChatId) {
      const msg = `🔔 *New TimeClok Signup!*\n\n📧 ${email}\n🕐 ${formattedTime} ET\n🆔 \`${userId}\`\n\n👉 [View Admin](https://timeclok.vercel.app/admin)`
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

    // === Email Notification (Resend) ===
    const resendKey = process.env.RESEND_API_KEY
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
              <h2 style="color:#00d9ff;margin:0 0 16px;">⏱ New TimeClok Signup</h2>
              <p style="color:#ccc;margin:0 0 8px;">Someone just signed up for TimeClok!</p>
              <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
                <div style="font-size:1.1rem;font-weight:700;">${email}</div>
                <div style="color:#666;font-size:0.875rem;margin-top:4px;">${formattedTime} ET</div>
              </div>
              <a href="https://timeclok.vercel.app/admin" style="display:inline-block;background:#00d9ff;color:#000;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;">
                View Admin Dashboard →
              </a>
            </div>
          `,
        }),
      })
    }

    console.log(`New signup: ${email} at ${createdAt}`)
    return Response.json({ ok: true, telegram: !!telegramToken, email: !!resendKey })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
