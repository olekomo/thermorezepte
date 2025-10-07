'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'

type Recipe = {
  id: string
  created_at: string
  title: string | null
  status: 'pending' | 'processing' | 'done' | 'error' | null
  image_path: string | null
  recipe_json: any | null
  error: string | null
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Recipe | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const nameInBucket = useMemo(() => {
    if (!data?.image_path) return null
    const parts = data.image_path.split('raw_uploads/')
    return parts[1] ?? null // "<uid>/<filename>"
  }, [data?.image_path])

  // load recipe
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setError(null)
        setLoading(true)
        const supabase = supabaseBrowser()
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', params.id)
          .maybeSingle()
        if (error) throw error
        if (!alive) return
        setData(data as Recipe)
      } catch (e: any) {
        setError(e?.message ?? 'Laden fehlgeschlagen')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [params.id])

  // create signed image url
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!nameInBucket) {
        setImgUrl(null)
        return
      }
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.storage
        .from('raw_uploads')
        .createSignedUrl(nameInBucket, 600)
      if (error) {
        console.warn(error)
        return
      }
      if (!alive) return
      setImgUrl(data?.signedUrl ?? null)
    })()
    return () => {
      alive = false
    }
  }, [nameInBucket])

  async function handleDeleteImage() {
    if (!nameInBucket) return
    if (!confirm('Bild wirklich löschen?')) return
    try {
      setBusy(true)
      const supabase = supabaseBrowser()
      const { error } = await supabase.storage.from('raw_uploads').remove([nameInBucket])
      if (error) throw error
      setImgUrl(null)
    } catch (e: any) {
      alert(`Fehler beim Löschen: ${e?.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteRecipe() {
    if (!confirm('Rezept wirklich löschen?')) return
    try {
      setBusy(true)
      const supabase = supabaseBrowser()
      const { error } = await supabase.from('recipes').delete().eq('id', params.id)
      if (error) throw error
      router.replace('/recipes')
    } catch (e: any) {
      alert(`Fehler beim Löschen: ${e?.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }

  // helpers to present JSON
  const notes = data?.recipe_json?.notes ?? data?.recipe_json?._meta?.notes ?? null
  const ingredients: Array<any> = Array.isArray(data?.recipe_json?.ingredients)
    ? data!.recipe_json.ingredients
    : []
  const steps: Array<any> = Array.isArray(data?.recipe_json?.steps) ? data!.recipe_json.steps : []

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      {loading && <div>lädt…</div>}
      {error && <div style={{ color: 'red' }}>Fehler: {error}</div>}
      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Titel zentriert */}
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 18, fontWeight: 700 }}>
            {data.title || 'Unbenanntes Rezept'}
          </div>

          {/* Kurzer Rezept-Teaser */}
          <div style={{ textAlign: 'center', color: '#666' }}>
            {ingredients.length > 0
              ? `${ingredients.length} Zutaten · ${steps.length} Schritte`
              : data.status === 'done'
                ? 'Rezeptdaten'
                : 'Rezept wird verarbeitet…'}
          </div>

          {/* Notizen */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Notizen</div>
            <div
              style={{
                minHeight: 40,
                background: '#f9fafb',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #eef2f7',
              }}
            >
              {notes ? String(notes) : <span style={{ color: '#999' }}>–</span>}
            </div>
          </div>

          {/* Bild-Box */}
          <div
            style={{
              border: '2px solid #bdbdbd',
              borderRadius: 12,
              height: 260,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            {imgUrl ? (
              <Image
                src={imgUrl}
                alt="Rezeptbild"
                width={360}
                height={360}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#777' }}>Bild</div>
            )}
          </div>

          {/* Details (optional, kompakt) */}
          {ingredients.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Zutaten</div>
              <ul style={{ marginLeft: 16 }}>
                {ingredients.slice(0, 8).map((ing, i) => (
                  <li key={i} style={{ fontSize: 14 }}>
                    {ing.amount ? `${ing.amount} ` : ''}
                    {ing.name}
                    {ing.notes ? ` (${ing.notes})` : ''}
                  </li>
                ))}
                {ingredients.length > 8 && (
                  <li style={{ color: '#666', fontSize: 12 }}>… weitere Zutaten</li>
                )}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Schritte</div>
              <ol style={{ marginLeft: 16 }}>
                {steps.slice(0, 6).map((st, i) => (
                  <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>
                    {st.step}
                  </li>
                ))}
                {steps.length > 6 && (
                  <li style={{ color: '#666', fontSize: 12 }}>… weitere Schritte</li>
                )}
              </ol>
            </div>
          )}

          {/* Bottom Actions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              position: 'sticky',
              bottom: 0,
              paddingBottom: 8,
            }}
          >
            <Button
              variant="secondary"
              onClick={handleDeleteImage}
              disabled={!nameInBucket || busy}
            >
              Bild löschen
            </Button>
            <Button
              variant="destructive"
              asChild={false}
              onClick={handleDeleteRecipe}
              disabled={busy}
            >
              Rezept löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
