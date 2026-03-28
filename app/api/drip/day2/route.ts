// Day 2 drip email — "Did you clock in your first employees?"
// Trigger this 2 days after signup (via cron job or Supabase pg_cron)
// POST body: { email: string, userId?: string } OR call with no body to process all pending

import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_fBF6MpTJ_2KrA33vWATsgQdt7m8UfKaVP'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'
const APP_URL = 'https://timeclok.vercel.app'

function day2EmailHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Did you clock in your first employees?</title>
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
      <div style="font-size:40px;text-align:center;margin-bottom:16px;">⏰</div>
      <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;text-align:center;">
        Did you clock in your first employees?
      </h1>
      <p style="color:#888;font-size:16px;line-height:1.7;margin:0 0 24px;">
        Hey! Just checking in — it's been a couple of days since you signed up for TimeClok. Have you had a chance to invite your first employee?
      </p>
      <p style="color:#888;font-size:16px;line-height:1.7;margin:0 0 24px;">
        It takes less than 2 minutes. Here's how:
      </p>

      <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;flex-shrink:0;">1️⃣</span>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">Go to your Owner Dashboard</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">Click "Invite Employee" in the top right</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;flex-shrink:0;">2️⃣</span>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">Enter their email address</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">They'll get a magic link to join your company</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:20px;flex-shrink:0;">3️⃣</span>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px;">They clock in from their phone</div>
              <div style="color:#666;font-size:13px;margin-top:2px;">GPS verified, no app download needed</div>
            </div>
          </div>
        </div>
      </div>

      <div style="background:rgba(0,180,216,0.08);border:1px solid rgba(0,180,216,0.2);border-radius:12px;padding:20px;margin-bottom:28px;">
        <div style="color:#00b4d8;font-size:13px;font-weight:700;margin-bottom:8px;">💡 Pro tip</div>
        <div style="color:#888;font-size:14px;line-height:1.6;">
          You can invite contractors too — they get their own login and can clock in/out independently. Perfect for freelancers and gig workers.
        </div>
      </div>

      <a href="${APP_URL}/owner/dashboard" style="display:block;text-align:center;background:#00b4d8;color:#000;padding:16px 32px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;letter-spacing:-0.01em;">
        Invite Your First Employee →
      </a>
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

async function sendDay2Email(email: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TimeClok <onboarding@resend.dev>',
      to: [email],
      subject: 'Did you clock in your first employees? ⏰',
      html: day2EmailHtml(email),
    }),
  })
  return res.ok
}

// POST /api/drip/day2
// Body: { email, userId } to send to one person
// Body: {} or no body to process all users due for day2 email
export async function POST(request: Request) {
  try {
    let body: any = {}
    try { body = await request.json() } catch {}

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if (body.email) {
      // Single user
      const ok = await sendDay2Email(body.email)
      if (ok && body.userId) {
        await supabase.from('drip_emails').update({ day2_sent: true }).eq('user_id', body.userId)
      }
      return Response.json({ ok, email: body.email })
    }

    // Batch: find all users who signed up 2+ days ago, haven't got day2 email
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { data: users, error } = await supabase
      .from('drip_emails')
      .select('*')
      .eq('day2_sent', false)
      .lte('signed_up_at', twoDaysAgo)
      .limit(50)

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const results = []
    for (const user of (users || [])) {
      const ok = await sendDay2Email(user.email)
      if (ok) {
        await supabase.from('drip_emails').update({ day2_sent: true }).eq('id', user.id)
      }
      results.push({ email: user.email, ok })
    }

    return Response.json({ ok: true, processed: results.length, results })
  } catch (err: any) {
    console.error('Day2 drip error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
