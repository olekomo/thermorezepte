// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

const PROTECTED_ROUTES = ['/app', '/camera', '/recipes', '/account', '/settings']
const AUTH_ROUTES = ['/create-account/password', '/log-in/password', '/log-in-or-create-account']
export async function middleware(req: NextRequest) {
  const { response, user } = await updateSession(req)
  const { pathname } = req.nextUrl

  const isProtectedRoute = PROTECTED_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isProtectedRoute && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/log-in-or-create-account'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    const url = req.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/app/:path*',
    '/settings/:path*',
    '/recipes/:path*',
    '/camera/:path*',
    '/account/:path*',
    '/log-in/password',
    '/create-account/password',
    '/log-in-or-create-account',
  ],
}
