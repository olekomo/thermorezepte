export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code')
  const redirectParam = url.searchParams.get('redirect') || '/'

  // nur relative Redirects erlauben (Open-Redirect-Schutz)
  const isRelative = redirectParam.startsWith('/')
  const target = isRelative ? redirectParam : '/'

  if (!code) {
    return NextResponse.redirect(new URL('/', url.origin))
  }

  // Redirect-Response vorab bauen (damit Cookies gesetzt werden können)
  const redirectUrl = new URL(target, url.origin)
  const res = NextResponse.redirect(redirectUrl)

  const { supabase, response } = createSupabaseForRoute(req, res)

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // z.B. auf eine Fehlerseite oder zurück auf Login mit Marker
      const fail = new URL(`/log-in?error=auth_code_invalid`, url.origin)
      return NextResponse.redirect(fail)
    }
  } catch {
    const fail = new URL(`/log-in?error=auth_code_exception`, url.origin)
    return NextResponse.redirect(fail)
  }

  return response
}
