import { isProRSC } from '@/lib/entitlements/isProRSC'
import { redirect } from 'next/navigation'

export default async function ProOnlyPage() {
  const isPro = await isProRSC()
  if (!isPro) {
    redirect('/pricing?reason=pro_required')
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">PRO Bereich</h1>
      {/* … dein Content … */}
    </main>
  )
}
