import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export async function isProRSC(): Promise<boolean> {
  const sb = await supabaseServerRSC() // 👈 wichtig: await
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return false

  const { data, error } = await sb
    .from('entitlements')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .eq('key', 'pro')
    .eq('source', 'stripe')
    .maybeSingle()

  if (error || !data) return false
  const active = data.status === 'active' || data.status === 'trialing'
  const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date()
  return active && notExpired
}
