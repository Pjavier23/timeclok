import { createServiceClient } from '../../../lib/supabase-server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'timeclok2026'

export async function POST(request: Request) {
  const pw = request.headers.get('x-admin-password')
  if (pw !== ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, userId, email, newPassword } = body
  const supabase = createServiceClient()

  // ── Password Reset ──────────────────────────────────────────────
  if (action === 'reset_password') {
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

    // Generate a recovery link (works even without Resend configured)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.com'}/auth/reset-password` },
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({
      ok: true,
      resetLink: (data as any)?.properties?.action_link || null,
      message: 'Reset link generated — send to user or use the link directly.',
    })
  }

  // ── Delete User ──────────────────────────────────────────────────
  if (action === 'delete_user') {
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    // Delete from public.users first (RLS), then auth
    await supabase.from('users').delete().eq('id', userId)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, message: 'User deleted.' })
  }

  // ── Confirm Email ────────────────────────────────────────────────
  if (action === 'confirm_email') {
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, message: 'Email confirmed.' })
  }

  // ── Update Password Directly ─────────────────────────────────────
  if (action === 'set_password') {
    if (!userId || !newPassword) return Response.json({ error: 'userId + newPassword required' }, { status: 400 })

    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, message: 'Password updated.' })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
