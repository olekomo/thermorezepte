import 'server-only'
import { NextResponse, type NextRequest, type NextResponse as NextRes } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseWithResponse = { supabase: SupabaseClient; response: NextRes }

export const createSupabaseForRoute = (req: NextRequest, res?: NextRes): SupabaseWithResponse => {
  // falls keine Response mitgegeben wird, eine anlegen (kannst du später weiterverwenden/returnen)
  const response = res ?? NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        // ✅ Hier dürfen wir setzen: in die *Response*-Cookies
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  return { supabase, response }
}
