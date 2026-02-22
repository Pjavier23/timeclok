import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return Response.json({ 
      error: 'Signup temporarily disabled. Please use the demo buttons on the landing page.' 
    }, { status: 503 })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Error' }, { status: 400 })
  }
}
