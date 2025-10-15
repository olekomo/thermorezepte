import { createSupabaseForRoute } from '@/lib/supabase/server-route'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code') || ''
  const type = url.searchParams.get('type') || ''

  const res = NextResponse.redirect(new URL('/app', url.origin))
  
  res.cookies.set('post_oauth_redirect', '', { path: '/', maxAge: 0 })

  const { supabase, response } = createSupabaseForRoute(req, res)

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/login?error=auth_code_invalid', url.origin))
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_code_exception', url.origin))
  }

  return response
}
