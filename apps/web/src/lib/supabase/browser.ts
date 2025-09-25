// apps/web/src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export const supabaseBrowser = () => {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Empfehlung: einheitlich ANON/PUBLISHABLE verwenden, aber nicht beides mischen
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}
