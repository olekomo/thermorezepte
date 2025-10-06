import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'

export async function POST(req: NextRequest) {
  const redirectTo = new URL('/', req.url)
  const res = NextResponse.redirect(redirectTo, { status: 302 })

  const { supabase, response } = createSupabaseForRoute(req, res)
  await supabase.auth.signOut()

  return response
}
