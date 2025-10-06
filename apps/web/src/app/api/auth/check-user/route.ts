// app/api/check-user/route.ts
import { supabaseAdmin } from '@/lib/supabase/admin'
export async function POST(req: Request) {
  const { email } = await req.json()

  const { data } = await supabaseAdmin.from('users').select('id').eq('email', email).single()

  return Response.json({ exists: !!data })
}
