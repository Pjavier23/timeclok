import Stripe from 'stripe'
import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey)

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const user = await getUserFromToken(token)
    if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 404 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', userData.company_id)
      .single()

    if (!company?.stripe_customer_id) {
      return Response.json({ error: 'No Stripe customer found. You need to subscribe first.' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'https://timeclok.vercel.app'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${origin}/owner/billing`,
    })

    return Response.json({ url: portalSession.url })
  } catch (err: any) {
    console.error('Portal error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
