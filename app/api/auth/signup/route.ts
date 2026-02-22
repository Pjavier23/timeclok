import crypto from 'crypto'

// Simple in-memory store for demo (in production, use database)
const demoSessions: { [key: string]: { email: string; userType: string; companyName?: string; createdAt: number } } = {}

export async function POST(request: Request) {
  try {
    const { email, userType, companyName } = await request.json()

    if (!email || !userType) {
      return Response.json({ error: 'Email and userType required' }, { status: 400 })
    }

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex')
    
    // Store session with 24h expiry
    demoSessions[token] = {
      email,
      userType,
      companyName: companyName || `${email.split('@')[0]}'s Company`,
      createdAt: Date.now()
    }

    // Generate magic link
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://timeclok.vercel.app'
    
    const magicLink = `${baseUrl}/demo-login?token=${token}`

    return Response.json({
      success: true,
      magicLink,
      message: `Magic link sent to ${email}. Click the link to access your dashboard.`
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return Response.json({ error: error.message || 'Signup failed' }, { status: 400 })
  }
}

// Export for use in demo-login page
export { demoSessions }
