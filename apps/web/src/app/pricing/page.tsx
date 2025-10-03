'use client'

import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PricingPage() {
  const handleCheckout = async () => {
    const res = await fetch('/api/create-checkout-session', { method: 'POST' })
    const data = await res.json()

    const stripe = await stripePromise
    if (stripe && data.url) {
      window.location.href = data.url // Weiterleitung zur Stripe-Checkout-Seite
    }
  }

  return (
    <main className="flex flex-col items-center justify-center p-10">
      <h1 className="text-2xl font-bold mb-4">Thermo Premium</h1>
      <p className="mb-6">Alle Rezepte & Features für nur 4,99 €/Monat</p>
      <button
        onClick={handleCheckout}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Jetzt abonnieren
      </button>
    </main>
  )
}
