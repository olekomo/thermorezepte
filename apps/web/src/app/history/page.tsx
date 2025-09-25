// Erklärung:
// Liest Dateien unter <uid>/ im Bucket, sortiert absteigend und zeigt Thumbnails über signed URLs.

'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

type Item = { name: string; signedUrl: string; updated_at?: string | null }

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const {
          data: { user },
          error: uerr,
        } = await supabaseBrowser().auth.getUser()
        if (uerr || !user) throw new Error('Nicht eingeloggt')

        const { data: list, error: lerr } = await supabaseBrowser()
          .storage.from('raw_uploads')
          .list(user.id, { limit: 50, sortBy: { column: 'updated_at', order: 'desc' } })

        if (lerr) throw lerr

        const withUrls: Item[] = []
        for (const f of list ?? []) {
          const key = `${user.id}/${f.name}`
          const { data: urlData, error: sErr } = await supabaseBrowser()
            .storage.from('raw_uploads')
            .createSignedUrl(key, 60 * 10) // 10 Minuten gültig

          if (!sErr && urlData) {
            withUrls.push({
              name: f.name,
              signedUrl: urlData.signedUrl,
              updated_at: (f as any).updated_at,
            })
          }
        }
        setItems(withUrls)
      } catch (e: any) {
        setErr(e.message ?? 'Fehler beim Laden der History')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <main className="p-6">Lade…</main>
  if (err) return <main className="p-6 text-red-600">Fehler: {err}</main>

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Deine letzten Uploads</h1>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <li key={it.name} className="rounded-xl border p-2">
            <img src={it.signedUrl} alt={it.name} className="w-full h-40 object-cover rounded-lg" />
            <p className="mt-2 text-xs text-gray-500 break-all">{it.name}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
