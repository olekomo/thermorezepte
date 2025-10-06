export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const redirect = url.searchParams.get('redirect') || '/'

  const res = NextResponse.redirect(new URL(redirect, url))
  const { supabase, response } = createSupabaseForRoute(req, res)

  await supabase.auth.getUser()

  return response
}
