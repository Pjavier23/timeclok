// Day 7 drip email — "Your first payroll report is ready 💰"
// Trigger this 7 days after signup (via cron job or Supabase pg_cron)
// POST body: { email: string, userId?: string } OR call with no body to process all pending

import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_fBF6MpTJ_2KrA33vWATsgQdt7m8UfKaVP'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkljofxcndnwqyqrtrnx.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGpvZnhjbmRud3F5cXJ0cm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2NzMxNSwiZXhwIjoyMDg3MzQzMzE1fQ.I07_YtatFR6sZfDRmjtwLTaMb83w-tRRAKMknoFXQFg'
const APP_URL = 'https://timeclok.vercel.app'

function day7EmailHtml(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your first payroll report is ready</title>
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
    <div style="background:#1a1a1a;border:1px solid rgba(34,197,94,0.2);border-radius:16px;padding:40px;margin-bottom:24px;">
      <div style="font-size:40px;text-align:center;margin-bottom:16px;">💰</div>
      <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;text-align:center;">
        Your first payroll report is ready!
      </h1>
      <p style="color:#888;font-size:16px;line-height:1.7;margin:0 0 24px;">
        It's been a week — which means your first payroll cycle is complete. TimeClok has automatically calculated all hours, overtime, and totals for your team.
      </p>

      <!-- Mock payroll summary -->
      <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="color:#22c55e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">📊 This Week's Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#1a1a1a;border-radius:8px;padding:12px;border-top:2px solid #00b4d8;">
            <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Total Hours</div>
            <div style="color:#00b4d8;font-size:22px;font-weight:900;">—h</div>
          </div>
          <div style="background:#1a1a1a;border-radius:8px;padding:12px;border-top:2px solid #22c55e;">
            <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Payroll Due</div>
            <div style="color:#22c55e;font-size:22px;font-weight:900;">$—</div>
          </div>
        </div>
        <div style="color:#555;font-size:12px;text-align:center;">Log in to see your actual numbers →</div>
      </div>

      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:20px;margin-bottom:28px;">
        <div style="color:#f59e0b;font-size:13px;font-weight:700;margin-bottom:8px;">🚀 Ready to scale?</div>
        <div style="color:#888;font-size:14px;line-height:1.6;">
          Upgrade to our <strong style="color:#fff;">$99/mo plan</strong> to unlock unlimited employees, advanced payroll reporting, CSV export, and priority support. No per-seat fees — flat rate for your whole team.
        </div>
      </div>

      <a href="${APP_URL}/owner/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:16px 32px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;letter-spacing:-0.01em;margin-bottom:12px;">
        View Payroll Dashboard →
      </a>
      <a href="${APP_URL}/auth/signup" style="display:block;text-align:center;background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.3);color:#00b4d8;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;">
        Upgrade to $99/mo — Unlimited Team
      </a>
    </div>

    <!-- Social proof -->
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">What business owners say</div>
      <div style="color:#ccc;font-size:14px;line-height:1.7;font-style:italic;margin-bottom:12px;">
        "TimeClok saved me 3 hours every week on payroll. My employees love clocking in from their phones. Worth every penny."
      </div>
      <div style="color:#555;font-size:13px;">— Maria G., Owner, MG Cleaning Services</div>
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

async function sendDay7Email(email: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TimeClok <onboarding@resend.dev>',
      to: [email],
      subject: 'Your first payroll report is ready 💰',
      html: day7EmailHtml(email),
    }),
  })
  return res.ok
}

// POST /api/drip/day7
// Body: { email, userId } to send to one person
// Body: {} or no body to process all users due for day7 email
export async function POST(request: Request) {
  try {
    let body: any = {}
    try { body = await request.json() } catch {}

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if (body.email) {
      const ok = await sendDay7Email(body.email)
      if (ok && body.userId) {
        await supabase.from('drip_emails').update({ day7_sent: true }).eq('user_id', body.userId)
      }
      return Response.json({ ok, email: body.email })
    }

    // Batch: find all users who signed up 7+ days ago, haven't got day7 email
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: users, error } = await supabase
      .from('drip_emails')
      .select('*')
      .eq('day7_sent', false)
      .lte('signed_up_at', sevenDaysAgo)
      .limit(50)

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const results = []
    for (const user of (users || [])) {
      const ok = await sendDay7Email(user.email)
      if (ok) {
        await supabase.from('drip_emails').update({ day7_sent: true }).eq('id', user.id)
      }
      results.push({ email: user.email, ok })
    }

    return Response.json({ ok: true, processed: results.length, results })
  } catch (err: any) {
    console.error('Day7 drip error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
