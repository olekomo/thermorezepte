import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  // Optional: hier könntest du anhand des eingeloggten Users Metadaten mitgeben
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', // für einmalige Zahlungen: 'payment'
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
  })

  // Du kannst direkt die URL zurückgeben
  return NextResponse.json({ url: session.url })
}
