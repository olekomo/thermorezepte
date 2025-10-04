// apps/web/app/api/create-checkout-session/route.ts
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

function requireEnv(name: string, { allowHttp = false } = {}) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  if (name === 'NEXT_PUBLIC_APP_URL' && !/^https?:\/\//.test(v)) {
    throw new Error(`${name} must start with http:// or https://`)
  }
  if (!allowHttp && v.startsWith('http://') && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} should use https:// in production`)
  }
  return v
}

export async function POST(req: Request) {
  try {
    const appUrl = requireEnv('NEXT_PUBLIC_APP_URL', { allowHttp: true })
    const priceId = process.env.STRIPE_PRICE_ID
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing env STRIPE_SECRET_KEY')
    if (!priceId) throw new Error('Missing env STRIPE_PRICE_ID')

    const { user_id } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id missing in request body' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      // customer_creation: 'always', // ❌ entfernen (nur für mode: 'payment')
      // Optional (falls du die E-Mail schon hast): customer_email: 'user@example.com',
      metadata: { user_id },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err: any) {
    console.error('create-checkout-session error:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
