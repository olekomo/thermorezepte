'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GoogleSignInButton } from '@/components/oauth/GoogleSignInButton'

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
      <h1 className="text-center font-bold text-xl">Anmelden</h1>
      <GoogleSignInButton />
      <div className="text-center">oder</div>
      <form
        onSubmit={e => {
          e.preventDefault()
          handleContinueWithEmail()
        }}
        style={{ display: 'grid', gap: 8 }}
      >
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="E-Mail-Adresse"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button size='2xl' type="submit" disabled={!email}>
          Weiter
        </Button>
      </form>
    </div>
  )
}
