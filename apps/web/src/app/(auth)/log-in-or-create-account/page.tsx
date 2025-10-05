'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Page() {
  const [email, setEmail] = useState('')

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 8 }}>
      <h1>Anmelden</h1>
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />

      <Link href={{ pathname: `/log-in/password`, query: { email } }}>
        <Button>Weiter</Button>
      </Link>
    </div>
  )
}
