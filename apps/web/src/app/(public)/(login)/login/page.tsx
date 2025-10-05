'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function Page() {
  const s = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const signup = async () => {
    const redirect = `${location.origin}/auth/callback?redirect=/`
    const { error } = await s.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect },
    })
    setMsg(error ? error.message : 'Check deine E-Mails zur Bestätigung.')
  }

  const login = async () => {
    const { error } = await s.auth.signInWithPassword({ email, password })
    setMsg(error ? error.message : 'Eingeloggt – Seite lädt neu...')
    if (!error) location.href = '/'
  }

  const magic = async () => {
    const { error } = await s.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?redirect=/` },
    })
    setMsg(error ? error.message : 'Magic Link gesendet.')
  }

  const reset = async () => {
    const { error } = await s.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?redirect=/reset-password`,
    })
    setMsg(error ? error.message : 'Passwort-Reset gesendet.')
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Login</h1>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Login (E-Mail/Passwort)</button>
      <button onClick={signup}>Signup</button>
      <button onClick={magic}>Magic Link</button>
      <button onClick={reset}>Passwort zurücksetzen</button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
