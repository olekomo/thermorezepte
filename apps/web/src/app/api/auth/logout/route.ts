import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseForRoute } from '@/lib/supabase/server-route'

export async function POST(req: NextRequest) {
  // wir erzeugen gleich die Redirect-Response und geben sie rein,
  // damit setAll darin die Cookies schreiben kann
  const redirectTo = new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  const res = NextResponse.redirect(redirectTo)

  const { supabase, response } = createSupabaseForRoute(req, res)
  await supabase.auth.signOut()

  return response
}
