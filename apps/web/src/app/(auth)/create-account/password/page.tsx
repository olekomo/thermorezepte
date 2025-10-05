'use client'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useState } from 'react'

export default function RegisterPage() {
  const s = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const signup = async () => {
    const redirect = `${location.origin}/api/auth/callback?redirect=/`
    const { error } = await s.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect },
    })
    setMsg(error ? error.message : 'Check deine E-Mails zur Bestätigung.')
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Account erstellen</h1>
      <input placeholder="E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} />
      <input
        placeholder="Passwort"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button onClick={signup}>Erstellen</Button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
