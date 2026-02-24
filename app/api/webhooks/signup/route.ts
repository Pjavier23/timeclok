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

    if (!email) {
      return Response.json({ ok: true, skipped: 'no email' })
    }

    const resendKey = process.env.RESEND_API_KEY
    const notifyEmail = process.env.NOTIFY_EMAIL || 'pedro@jastheshop.com'

    if (resendKey) {
      // Send notification email to Pedro
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
                <div style="color:#666;font-size:0.875rem;margin-top:4px;">${new Date(createdAt).toLocaleString()}</div>
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
    return Response.json({ ok: true, notified: !!resendKey })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
