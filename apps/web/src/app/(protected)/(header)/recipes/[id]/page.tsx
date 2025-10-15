'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Clock,
  ImageIcon,
  ListChecks,
  Thermometer,
  Gauge,
  Timer as TimerIcon,
  ChefHat,
} from 'lucide-react'

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

  // helpers to present JSON (unverändert inhaltlich)
  const notes = data?.recipe_json?.notes ?? data?.recipe_json?._meta?.notes ?? null
  const ingredients: Array<any> = Array.isArray(data?.recipe_json?.ingredients)
    ? data!.recipe_json.ingredients
    : []
  const steps: Array<any> = Array.isArray(data?.recipe_json?.steps) ? data!.recipe_json.steps : []

  const countLine =
    ingredients.length > 0
      ? `${ingredients.length} Zutaten · ${steps.length} Schritte`
      : data?.status === 'done'
        ? 'Rezeptdaten'
        : 'Rezept wird verarbeitet…'

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-xl"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 size-4" aria-hidden />
          Zurück
        </Button>

        {data?.status && <StatusPill status={data.status} />}
        <div className="ml-auto text-xs text-muted-foreground">
          {data?.created_at ? formatDate(data.created_at) : null}
        </div>
      </div>

      {/* Loading / Error / Content */}
      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Fehler: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-5 sm:space-y-6">
          {/* Title + counts */}
          <div className="text-center">
            <h1 className="text-xl font-semibold leading-tight">
              {data.title || 'Unbenanntes Rezept'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{countLine}</p>
          </div>

          {/* Notes */}
          <section>
            <div className="mb-2 font-semibold">Notizen</div>
            <div className="min-h-10 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
              {notes ? String(notes) : <span className="text-muted-foreground">–</span>}
            </div>
          </section>

          {/* Image */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">Bild</span>
            </div>
            <div className="relative h-64 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              {imgUrl ? (
                <Image
                  src={imgUrl}
                  alt="Rezeptbild"
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  Kein Bild vorhanden
                </div>
              )}
            </div>
          </section>

          {/* Ingredients – alle anzeigen */}
          {ingredients.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <ListChecks className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-semibold">Zutaten</span>
              </div>
              <ul className="ml-4 list-disc space-y-1.5">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm leading-6">
                    {formatIngredient(ing)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Steps – alle anzeigen, Thermomix-Settings klar als Chips */}
          {steps.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-semibold">Schritte</span>
              </div>
              <ol className="ml-5 list-decimal space-y-3">
                {steps.map((st, i) => (
                  <li key={i} className="text-sm leading-6">
                    <div>{getStepText(st, i)}</div>
                    <StepMetaChips step={st} />
                    {st?.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Hinweis: {String(st.notes)}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Bottom actions (sticky) */}
          <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-background/90 to-transparent px-4 pb-2 pt-3 backdrop-blur supports-[backdrop-filter]:from-background/70">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={handleDeleteImage}
                disabled={!nameInBucket || busy}
                className="rounded-xl"
              >
                Bild löschen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRecipe}
                disabled={busy}
                className="rounded-xl"
              >
                Rezept löschen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- UI helpers (nur Darstellung) ---------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted/70" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted/60" />
    </div>
  )
}

function StatusPill({ status }: { status: Recipe['status'] }) {
  const map: Record<NonNullable<Recipe['status']>, string> = {
    pending: 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30',
    processing: 'bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30',
    done: 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30',
    error: 'bg-red-500/15 text-red-700 ring-1 ring-red-500/30',
  }
  const cls = status ? map[status] : 'bg-muted text-muted-foreground'
  const label =
    status === 'pending'
      ? 'Wartet'
      : status === 'processing'
        ? 'In Bearbeitung'
        : status === 'done'
          ? 'Fertig'
          : status === 'error'
            ? 'Fehler'
            : 'Unbekannt'
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>
  )
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatIngredient(ing: any) {
  const amount = ing?.amount ? String(ing.amount) : ''
  const unit = ing?.unit ? ` ${ing.unit}` : ''
  const name = ing?.name ?? ing?.text ?? ''
  const notes = ing?.notes ? ` (${ing.notes})` : ''
  return `${amount}${unit}${amount || unit ? ' ' : ''}${name}${notes}`.trim() || 'Zutat'
}

function getStepText(st: any, index: number) {
  return (
    st?.step ??
    st?.instruction ??
    (typeof st?.text === 'string' ? st.text : undefined) ??
    `Schritt ${index + 1}`
  )
}

/** Theromix-Meta als gut sichtbare Chips; Zeit < 2min in Sekunden, sonst Minuten */
function StepMetaChips({ step }: { step: any }) {
  const t = step?.thermomix
  if (!t) return null

  const items: Array<{ icon: React.ReactNode; label: string }> = []

  if (t.mode) {
    items.push({ icon: <ChefHat className="size-3.5" />, label: t.mode })
  }
  if (t.temp_c !== undefined && t.temp_c !== null) {
    items.push({ icon: <Thermometer className="size-3.5" />, label: `${t.temp_c}°C` })
  }
  if (t.speed) {
    items.push({ icon: <Gauge className="size-3.5" />, label: `Stufe ${t.speed}` })
  }
  if (t.time_seconds !== undefined && t.time_seconds !== null) {
    items.push({ icon: <TimerIcon className="size-3.5" />, label: formatThermoTime(t.time_seconds) })
  }

  if (items.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] leading-5 text-foreground"
        >
          {it.icon}
          {it.label}
        </span>
      ))}
    </div>
  )
}

/** Zeitformat: < 120s → „Sek.“, sonst gerundete Minuten (min. 1) */
function formatThermoTime(seconds: number): string {
  if (seconds < 120) {
    const s = Math.max(1, Math.round(seconds))
    return `${s} Sek.`
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}
