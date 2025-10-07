'use client'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useEffect, useMemo, useState } from 'react'

export default function CreateAccountPage() {
  const s = useMemo(() => supabaseBrowser(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setEmail(sessionStorage.getItem('emailPrefill') || '')
  }, [])

  const signup = async () => {
    try {
      setBusy(true)
      const redirect = `${location.origin}/api/auth/callback?redirect=/app`
      const { error } = await s.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirect },
      })
      setMsg(error ? error.message : 'Check deine E-Mails zur Bestätigung.')
    } catch (e: any) {
      setMsg(e?.message ?? 'Unbekannter Fehler.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Account erstellen</h1>
      <form
        onSubmit={e => {
          e.preventDefault()
          signup()
        }}
        style={{ display: 'grid', gap: 8 }}
      >
        <input
          placeholder="E-Mail-Adresse"
          inputMode="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          placeholder="Passwort"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={busy || !email || !password}>
          Erstellen
        </Button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  )
}
