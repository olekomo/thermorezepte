import { ROUTES } from '@/lib/routes'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code')
  // 1) Fehlenden Code abfangen
  if (!code) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=missing_code`, url.origin),
      { status: 303 }
    )
  }

  // 2) Ziel bestimmen (Recovery → Reset-Page, sonst App)
  const target = ROUTES.resetPassword

  // 4) Redirect-Response vorbereiten (auf diese Response werden Cookies gesetzt)
  const res = NextResponse.redirect(new URL(target, url.origin), { status: 303 })

  // Transientes Cookie löschen
  res.cookies.set('post_oauth_redirect', '', { path: '/', maxAge: 0 })

  const { supabase, response } = createSupabaseForRoute(req, res)

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        new URL(`${ROUTES.login}?error=auth_code_invalid`, url.origin),
        { status: 303 }
      )
    }
  } catch {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=auth_code_exception`, url.origin),
      { status: 303 }
    )
  }

  // 5) Erfolg: Redirect + gesetzte Cookies ausliefern
  return response
}
