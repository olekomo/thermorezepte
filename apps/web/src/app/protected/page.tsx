// apps/web/app/protected/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { isPro } from '@/lib/entitlements/isPro'

export default function ProtectedPage() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    isPro().then(setOk)
  }, [])
  if (ok === null) return <main className="p-10">Prüfe Pro-Status…</main>
  if (!ok)
    return (
      <main className="p-10">
        Diese Seite ist nur für <b>Pro</b>.{' '}
        <a className="text-blue-600 underline" href="/pricing">
          Upgrade
        </a>
      </main>
    )
  return <main className="p-10">Willkommen bei Pro-Inhalten ✨</main>
}
