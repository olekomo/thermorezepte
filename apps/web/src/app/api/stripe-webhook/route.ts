// apps/web/app/api/stripe-webhook/route.ts
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

// Raw-Body in App Router:
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ==== ENV CHECKS (mit klaren Logs) ====
const HAS_SUPABASE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[webhook] WARN: STRIPE_SECRET_KEY fehlt – Stripe-Verifikation wird scheitern.')
}
if (!HAS_SUPABASE) {
  console.warn(
    '[webhook] WARN: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt – DB-Updates werden übersprungen.',
  )
}

const supabase = HAS_SUPABASE
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null

// ==== Helpers (Supabase) ====
async function getUserIdByCustomer(customerId: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

async function attachCustomerToUser(userId: string, customerId: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('users')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId)
  if (error) throw error
}

async function upsertEntitlement(params: {
  userId: string
  status: string
  priceId?: string | null
  subscriptionId?: string | null
  currentPeriodEnd?: number | null // unix ts (Sekunden)
  nowIso: string
}) {
  if (!supabase) return
  const { userId, status, priceId, subscriptionId, currentPeriodEnd, nowIso } = params
  const currentPeriodEndIso = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null

  const { error } = await supabase.from('entitlements').upsert(
    {
      user_id: userId,
      key: 'pro',
      source: 'stripe',
      status,
      stripe_price_id: priceId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      current_period_end: currentPeriodEndIso,
      last_event_at: nowIso,
    },
    { onConflict: 'stripe_subscription_id' },
  )
  if (error) throw error
}

// ==== Helpers (Invoice) ====
function getInvoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const sub: unknown = (inv as any).subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : ((sub as { id?: string }).id ?? null)
}

function getInvoicePriceId(inv: Stripe.Invoice): string | null {
  const line: any = inv.lines?.data?.[0] ?? null
  return line?.price?.id ?? line?.plan?.id ?? null
}

function getInvoicePeriodEnd(inv: Stripe.Invoice): number | null {
  const line: any = inv.lines?.data?.[0] ?? null
  return line?.period?.end ?? null
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const cpe: unknown = (sub as any).current_period_end
  return typeof cpe === 'number' ? cpe : null
}

// ==== Handler ====
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    console.error('[webhook] 400 Missing signature/secret')
    return new NextResponse('Missing webhook signature/secret', { status: 400 })
  }

  const payload = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] constructEvent error:', err?.message ?? err)
    return new NextResponse(`Webhook Error: ${err.message ?? err}`, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const type = event.type
  console.log('[webhook] received:', type)

  try {
    switch (type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const customerId = session.customer as string | null
        if (userId && customerId) {
          try {
            await attachCustomerToUser(userId, customerId)
            console.log('[webhook] attached customer to user', { userId, customerId })
          } catch (e: any) {
            console.error('[webhook] attachCustomerToUser failed:', e?.message ?? e)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        let userId: string | null = null

        try {
          userId = await getUserIdByCustomer(customerId)
        } catch (e: any) {
          console.error('[webhook] getUserIdByCustomer error:', e?.message ?? e)
        }

        if (!userId) {
          console.warn('[webhook] no user mapped for customer:', customerId, '— skipping')
          break
        }

        try {
          await upsertEntitlement({
            userId,
            status: sub.status,
            priceId: sub.items.data[0]?.price?.id ?? null,
            subscriptionId: sub.id,
            currentPeriodEnd: getSubscriptionPeriodEnd(sub),
            nowIso,
          })
          console.log('[webhook] entitlement upsert ok', {
            userId,
            subId: sub.id,
            status: sub.status,
          })
        } catch (e: any) {
          console.error('[webhook] upsertEntitlement error:', e?.message ?? e)
        }

        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = inv.customer as string
        let userId: string | null = null

        try {
          userId = await getUserIdByCustomer(customerId)
        } catch (e: any) {
          console.error('[webhook] getUserIdByCustomer error:', e?.message ?? e)
        }

        if (!userId) {
          console.warn('[webhook] no user mapped for customer:', customerId, '— skipping')
          break
        }

        try {
          await upsertEntitlement({
            userId,
            status: 'past_due',
            priceId: getInvoicePriceId(inv),
            subscriptionId: getInvoiceSubscriptionId(inv),
            currentPeriodEnd: getInvoicePeriodEnd(inv),
            nowIso,
          })
          console.log('[webhook] entitlement set past_due', { userId })
        } catch (e: any) {
          console.error('[webhook] upsertEntitlement error:', e?.message ?? e)
        }

        break
      }

      default:
        // andere Events ignorieren
        break
    }
  } catch (err: any) {
    // WÄHREND DER FEHLERSUCHE: 200 zurückgeben, damit Stripe nicht spammy retryt
    console.error('[webhook] handler top-level error:', err?.message ?? err)
    return NextResponse.json({ received: true, note: 'error-swallowed-for-debug' })
  }

  return NextResponse.json({ received: true })
}
