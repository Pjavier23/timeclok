import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export async function POST(request: Request) {
  try {
    const { method, email, phoneNumber, inviteLink, companyName } = await request.json()

    if (!method || !inviteLink || !companyName) {
      return Response.json(
        { error: 'method, inviteLink, and companyName required' },
        { status: 400 }
      )
    }

    if (method === 'email' && !email) {
      return Response.json({ error: 'email required for email method' }, { status: 400 })
    }

    if (method === 'sms' && !phoneNumber) {
      return Response.json({ error: 'phoneNumber required for SMS method' }, { status: 400 })
    }

    // Email sending (using a service like SendGrid, Resend, or similar)
    if (method === 'email') {
      // For now, return success - in production integrate SendGrid/Resend
      console.log('Email invite would be sent to:', email)
      console.log('Link:', inviteLink)

      return Response.json(
        {
          success: true,
          message: `Invite sent to ${email}`,
          method: 'email',
        },
        { status: 200 }
      )
    }

    // SMS sending (using Twilio or similar)
    if (method === 'sms') {
      // For now, return success - in production integrate Twilio
      console.log('SMS invite would be sent to:', phoneNumber)
      console.log('Link:', inviteLink)

      return Response.json(
        {
          success: true,
          message: `Invite sent to ${phoneNumber}`,
          method: 'sms',
        },
        { status: 200 }
      )
    }

    return Response.json({ error: 'Invalid method' }, { status: 400 })
  } catch (err: any) {
    console.error('Send invite error:', err)
    return Response.json({ error: err.message || 'Failed to send invite' }, { status: 400 })
  }
}
