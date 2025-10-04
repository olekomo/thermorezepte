import { NextResponse } from 'next/server'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'

export async function GET(req: Request) {
  const sb = await createSupabaseForRoute(req as any).supabase // 👈 wichtig: await
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ isPro: false })

  const { data, error } = await sb
    .from('entitlements')
    .select('status,current_period_end')
    .eq('user_id', user.id)
    .eq('key', 'pro')
    .eq('source', 'stripe')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ isPro: false })

  const active = data.status === 'active' || data.status === 'trialing'
  const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date()
  return NextResponse.json({ isPro: active && notExpired })
}
