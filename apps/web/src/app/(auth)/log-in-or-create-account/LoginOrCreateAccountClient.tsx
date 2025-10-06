'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function LoginOrCreateAccountClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    setEmail(sessionStorage.getItem('emailPrefill') || '')
  }, [])

  useEffect(() => {
    sessionStorage.setItem('emailPrefill', email)
  }, [email])

  const checkUser = async () => {
    const res = await fetch('/api/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    return data.exists
  }

  const handleContinueWithEmail = async () => {
    const userWithEmailExists = await checkUser()
    if (userWithEmailExists) {
      router.push('/log-in/password')
    } else {
      router.push('/create-account/password')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Anmelden</h1>
      <input placeholder="E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} />
      <Button onClick={handleContinueWithEmail} disabled={!email}>
        Weiter
      </Button>
    </div>
  )
}
