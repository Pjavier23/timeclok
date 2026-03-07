import Stripe from 'stripe'
import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return Response.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel env vars.' }, { status: 503 })
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
      .select('company_id, full_name')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 404 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id, name, stripe_customer_id, subscription_status')
      .eq('id', userData.company_id)
      .single()

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if already subscribed
    if (company.subscription_status === 'active') {
      return Response.json({ error: 'Already subscribed' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = company.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || '',
        name: company.name,
        metadata: { companyId: company.id, userId: user.id },
      })
      customerId = customer.id

      // Save customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id)
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://timeclok.com'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'TimeClok Pro',
              description: 'Full access to payroll, time tracking, and employee management',
              images: [],
            },
            recurring: { interval: 'month' },
            unit_amount: 9900, // $99.00
          },
          quantity: 1,
        },
      ],
      metadata: { companyId: company.id, userId: user.id },
      success_url: `${origin}/owner/dashboard?billing=success`,
      cancel_url: `${origin}/owner/dashboard?billing=cancelled`,
    })

    return Response.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
