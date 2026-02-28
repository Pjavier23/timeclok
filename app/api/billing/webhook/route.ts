import Stripe from 'stripe'
import { createServiceClient } from '../../../lib/supabase-server'

export const config = { api: { bodyParser: false } }

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripeKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey)
    const body = await request.text()
    const sig = request.headers.get('stripe-signature') || ''

    let event: Stripe.Event

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
      }
    } else {
      // Allow unverified in dev (no webhook secret set)
      event = JSON.parse(body) as Stripe.Event
    }

    const supabase = createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.metadata?.companyId
        if (!companyId) break

        await supabase
          .from('companies')
          .update({
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', companyId)

        console.log(`✅ Subscription activated for company ${companyId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('companies')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_customer_id', customerId)

        console.log(`❌ Subscription cancelled for customer ${customerId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isActive = subscription.status === 'active'

        await supabase
          .from('companies')
          .update({ subscription_status: isActive ? 'active' : 'cancelled' })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
