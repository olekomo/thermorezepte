'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { ROUTES } from '@/lib/routes'

function parseHash(fragment: string) {
  const q = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment)
  return Object.fromEntries(q.entries()) as Record<string, string>
}

export default function CallbackClient() {
  const router = useRouter()
  const search = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const supabase = supabaseBrowser()

    ;(async () => {
      try {
        const hash = window.location.hash || ''
        const kv = parseHash(hash)
        const access_token = kv['access_token']
        const refresh_token = kv['refresh_token']
        const type = (kv['type'] || '').toLowerCase() // 'magiclink' | 'signup' | 'recovery'

        if (!access_token || !refresh_token) {
          throw new Error('Kein URL-Fragment gefunden (Tracking aktiv?).')
        }

        // Session setzen (SDK v2)
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error

        // Ziel ermitteln (nur relative Pfade erlauben)
        const qRedirect = search.get('redirect')
        const intentFallback =
          type === 'recovery'
            ? ROUTES.resetPassword
            : type === 'signup'
              ? ROUTES.loginOrCreateAccount
              : ROUTES.app

        const target = qRedirect && qRedirect.startsWith('/') ? qRedirect : intentFallback
        router.replace(target)
      } catch (err) {
        console.error('Auth callback failed:', err)
        router.replace(`${ROUTES.login}?error=callback_failed`)
      }
    })()
  }, [router, search])

  return <p>Wird angemeldet …</p>
}
