'use client'

import { loadStripe } from '@stripe/stripe-js'
import { supabaseBrowser } from '@/lib/supabase/browser'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PricingPage() {
  const handleCheckout = async () => {
    const supabase = supabaseBrowser()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Bitte zuerst einloggen.')
      return
    }

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error(data)
      alert('Fehler beim Erstellen der Checkout-Session.')
      return
    }

    const stripe = await stripePromise
    if (stripe && data.url) window.location.href = data.url
  }

  return (
    <main className="flex flex-col items-center justify-center p-10">
      <h1 className="text-2xl font-bold mb-4">Thermo Pro</h1>
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
