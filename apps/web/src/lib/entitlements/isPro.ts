import { supabaseBrowser } from '../supabase/browser'

export async function isPro() {
  const supabase = supabaseBrowser()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('entitlements')
    .select('status')
    .eq('user_id', user.id)
    .eq('key', 'pro')
    .eq('source', 'stripe')
    .maybeSingle()

  return !!data && ['active', 'trialing'].includes(data.status)
}
