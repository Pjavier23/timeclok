import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, userType, companyName } = await request.json()

    if (!email || !userType) {
      return Response.json({ error: 'Email and userType required' }, { status: 400 })
    }

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex')
    
    // Generate magic link
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://timeclok.vercel.app'
    
    const magicLink = `${baseUrl}/demo-login?token=${token}&email=${encodeURIComponent(email)}&userType=${userType}&company=${encodeURIComponent(companyName || email.split('@')[0])}`

    return Response.json({
      success: true,
      magicLink,
      email,
      userType,
      companyName: companyName || `${email.split('@')[0]}'s Company`,
      message: `Magic link sent to ${email}. Click the link to access your dashboard.`
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}
