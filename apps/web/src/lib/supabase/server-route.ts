import 'server-only'
import { NextResponse, type NextRequest, type NextResponse as NextRes } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseWithResponse = { supabase: SupabaseClient; response: NextRes }

export const createSupabaseForRoute = (req: NextRequest, res?: NextRes): SupabaseWithResponse => {
  const response = res ?? NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
      // Optional: relevante Forwarded-Header direkt vom Request durchreichen
      global: {
        headers: {
          'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '',
          'User-Agent': req.headers.get('user-agent') ?? '',
        },
      },
    },
  )

  return { supabase, response }
}
