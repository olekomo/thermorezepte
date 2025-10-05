'use client'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const s = supabaseBrowser()
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const e = searchParams.get('email')
    if (e) setEmail(e)
  }, [searchParams])

  const login = async () => {
    const { error } = await s.auth.signInWithPassword({ email, password })
    setMsg(error ? error.message : 'Eingeloggt – Seite lädt neu...')
    if (!error) location.href = '/'
  }

  const reset = async () => {
    const { error } = await s.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?redirect=/reset-password`,
    })
    setMsg(error ? error.message : 'Passwort-Reset gesendet.')
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Anmelden</h1>
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button onClick={login}>Anmelden</Button>
      <Button variant="link" onClick={reset}>
        Passwort vergessen
      </Button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
