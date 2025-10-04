'use client'
import { useIsPro } from '@/hooks/useIsPro'
import Link from 'next/link'

export function ProGate({ children }: { children: React.ReactNode }) {
  const { isPro, loading } = useIsPro()
  if (loading) return <p>Lade…</p>
  if (!isPro) {
    return (
      <div className="p-6">
        <p>Für diesen Bereich brauchst du PRO.</p>
        <Link className="underline" href="/pricing">
          Zu Pricing
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
