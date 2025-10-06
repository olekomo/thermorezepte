'use client'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginClient() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Supabase-Client lazy nach Mount erstellen
  const supabaseRef = useRef<ReturnType<any> | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { supabaseBrowser } = await import('@/lib/supabase/browser')
      if (mounted) supabaseRef.current = supabaseBrowser()
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setEmail(sessionStorage.getItem('emailPrefill') || '')
  }, [])

  const login = useCallback(async () => {
    try {
      setBusy(true)
      const s = supabaseRef.current ?? (await import('@/lib/supabase/browser')).supabaseBrowser()
      const { error } = await s.auth.signInWithPassword({ email, password })
      setMsg(error ? error.message : 'Eingeloggt – weiterleiten...')
      if (!error) {
        router.replace('/app')
        setTimeout(() => router.refresh(), 0)
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'Unbekannter Fehler beim Anmelden.')
    } finally {
      setBusy(false)
    }
  }, [email, password, router])

  const reset = useCallback(async () => {
    try {
      setBusy(true)
      const s = supabaseRef.current ?? (await import('@/lib/supabase/browser')).supabaseBrowser()

      const { error } = await s.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=/reset-password`,
      })
      setMsg(error ? error.message : 'Passwort-Reset gesendet.')
    } catch (e: any) {
      setMsg(e?.message ?? 'Unbekannter Fehler beim Zurücksetzen.')
    } finally {
      setBusy(false)
    }
  }, [email])

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Anmelden</h1>
      <input
        placeholder="E-Mail-Adresse"
        inputMode="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button onClick={login} disabled={!email || !password || busy}>
        Anmelden
      </Button>
      <Button variant="link" onClick={reset} disabled={!email || busy}>
        Passwort vergessen
      </Button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
