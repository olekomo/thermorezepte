'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'

type RecipeListItem = {
  id: string
  created_at: string
  title: string | null
  status: 'pending' | 'processing' | 'done' | 'error' | null
}

export default function RecipesPage() {
  const [items, setItems] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setError(null)
        setLoading(true)
        const supabase = supabaseBrowser()
        // dank RLS reicht theoretisch select *, aber wir filtern und sortieren explizit:
        const { data, error } = await supabase
          .from('recipes')
          .select('id, created_at, title, status')
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!alive) return
        setItems((data ?? []) as RecipeListItem[])
      } catch (e: any) {
        setError(e?.message ?? 'Laden fehlgeschlagen')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      {/* List-Container mit Card-Look */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 12,
          background: '#fff',
          minHeight: 420,
        }}
      >
        {loading && <div>lädt…</div>}
        {error && <div style={{ color: 'red' }}>Fehler: {error}</div>}

        {!loading && !error && items.length === 0 && (
          <div style={{ color: '#666', padding: 12 }}>Noch keine Rezepte.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(r => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              style={{
                display: 'block',
                padding: '12px 8px',
                borderRadius: 12,
                textDecoration: 'none',
                color: '#111',
                background: '#f9fafb',
                border: '1px solid #eef2f7',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{r.title || 'Unbenanntes Rezept'}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                {new Date(r.created_at).toLocaleString()} · {r.status ?? 'unbekannt'}
              </div>
            </Link>
          ))}
        </div>

        {/* optional: Refresh */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => {
              // simple reload – triggert useEffect erneut
              window.location.reload()
            }}
          >
            Aktualisieren
          </Button>
        </div>
      </div>
    </div>
  )
}
