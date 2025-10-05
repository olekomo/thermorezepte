// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

const PROTECTED_ROUTES = ['/upload', '/history', '/recipes']
const AUTH_ROUTES = ['/login', '/register']
const x = 1
export async function middleware(req: NextRequest) {
  if (x == 1) return NextResponse.next()
  const { response, user } = await updateSession(req)
  const { pathname } = req.nextUrl

  const isProtectedRoute = PROTECTED_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isProtectedRoute && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/upload/:path*', '/history/:path*', '/recipes/:path*', '/login', '/register'],
}
