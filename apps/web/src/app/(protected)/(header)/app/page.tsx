'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import CameraButton from '@/components/CameraButton'
import { compressImage } from '@/hooks/useCompressImage'
import { supabaseBrowser } from '@/lib/supabase/browser'

type Ingredient = {
  name?: string
  amount?: string | number
  unit?: string
  notes?: string
  text?: string
}

type Step = {
  step?: string
  instruction?: string
  notes?: string
  thermomix?: {
    mode?: string
    temp_c?: number | null
    speed?: string
    time_seconds?: number | null
  }
  [key: string]: unknown
}

type RecipeJson = {
  title?: string
  portions?: number | string
  duration_minutes?: number | string
  ingredients?: Ingredient[]
  steps?: Step[]
  [key: string]: unknown
}

type RecipeRow = {
  id?: string
  status?: 'pending' | 'processing' | 'done' | 'error' | null
  title?: string | null
  image_path?: string | null
  recipe_json?: RecipeJson | null
  error?: string | null
  error_message?: string | null
}

export default function AppPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [status, setStatus] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipe, setRecipe] = useState<RecipeRow | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tmVersion, setTmVersion] = useState<'t5' | 't6' | 't7' | ''>('')
  const [tmSaveInfo, setTmSaveInfo] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // cleanup preview blobs
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  // initial load of thermomix_version
  useEffect(() => {
    ;(async () => {
      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('users')
        .select('thermomix_version')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data?.thermomix_version) {
        setTmVersion(data.thermomix_version as 't5' | 't6' | 't7')
      }
    })()
  }, [])

  // save thermomix version immediately on change
  const saveThermomixVersion = useCallback(async (v: 't5' | 't6' | 't7') => {
    try {
      setTmSaveInfo(null)
      const supabase = supabaseBrowser()
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Nicht eingeloggt')
      const { error: upErr } = await supabase
        .from('users')
        .update({ thermomix_version: v })
        .eq('id', user.id)
      if (upErr) throw upErr
      setTmSaveInfo('Version gespeichert')
      setTimeout(() => setTmSaveInfo(null), 1500)
    } catch (e: any) {
      setTmSaveInfo(`Fehler: ${e?.message ?? e}`)
    }
  }, [])

  // choose file (like "Rezept hochladen")
  const onPickFromDisk = useCallback((f: File) => {
    const url = URL.createObjectURL(f)
    setFile(f)
    setPreview(url)
    setRecipe(null)
    setRecipeError(null)
    setStatus(null)
    setError(null)
    setIsPolling(false)
    setImagePath(null)
  }, [])

  // submit: compress + upload + call /api/parse + start polling
  const onSubmit = useCallback(async () => {
    try {
      setError(null)
      setRecipeError(null)
      setRecipe(null)

      if (!file) throw new Error('Kein Bild ausgewählt')

      setStatus('Bild komprimieren…')
      const compressed = await compressImage(file, 2048, 0.82)

      setStatus('Bild hochladen…')
      const supabase = supabaseBrowser()
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!currentUser) throw new Error('Nicht eingeloggt')

      const path = `${currentUser.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('raw_uploads')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError

      const fullPath = `raw_uploads/${path}`
      setImagePath(fullPath)
      setIsPolling(true)
      setStatus('Analysiere Rezept…')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Keine Session')

      // Call deine Next-API (/api/parse) -> ruft die Edge Function auf
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_path: fullPath, thermomix_version: tmVersion || 't6' }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`API-Fehler: ${txt}`)
      }

      // Start polling recipes
      setStatus('Bild wird verarbeitet…')
    } catch (e: any) {
      console.error('Submit error', e)
      setIsPolling(false)
      setImagePath(null)
      setStatus(null)
      setError(e?.message ?? 'Unbekannter Fehler beim Abschicken.')
    }
  }, [file, tmVersion])

  // polling recipes table
  useEffect(() => {
    if (!imagePath || !isPolling) return
    let cancelled = false
    let timer: number | null = null
    const supabase = supabaseBrowser()
    const startedAt = Date.now()
    const pollMs = 2000
    const maxMs = 60000

    async function tick() {
      if (cancelled) return
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('image_path', imagePath)
        .maybeSingle()

      if (error) {
        setRecipeError(error.message)
        setIsPolling(false)
        setStatus(null)
        return
      }

      if (data) {
        const row = data as RecipeRow
        setRecipe(row)
        if (row.status === 'done') {
          setStatus('Rezept erstellt.')
          setIsPolling(false)
          return
        }
        if (row.status === 'error') {
          const message = row.error ?? row.error_message ?? 'Fehler beim Erstellen des Rezepts.'
          setRecipeError(message)
          setStatus(null)
          setIsPolling(false)
          return
        }
      }

      const elapsed = Date.now() - startedAt
      if (elapsed >= maxMs) {
        setRecipeError('Timeout beim Warten auf das Rezept.')
        setIsPolling(false)
        return
      }
      timer = window.setTimeout(tick, pollMs)
    }

    tick()
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [imagePath, isPolling])

  const recipeJson = recipe?.recipe_json ?? null
  const rawIngredients = recipeJson?.ingredients
  const rawSteps = recipeJson?.steps

  const ingredients: Array<Ingredient | string> = Array.isArray(rawIngredients)
    ? (rawIngredients as Array<Ingredient | string>)
    : []
  const steps: Array<Step | string> = Array.isArray(rawSteps)
    ? (rawSteps as Array<Step | string>)
    : []

  const recipeId = recipe?.id ?? null
  const showRecipe = recipe?.status === 'done'
  const showSpinner = isPolling
  const hasPreview = Boolean(preview)
  const recipeTitle = recipe?.title ?? recipeJson?.title ?? 'Rezept'
  const hasStructuredRecipeData = ingredients.length > 0 || steps.length > 0

  return (
    <div className="mx-auto w-full max-w-screen-sm space-y-4 px-4 sm:space-y-6">
      {/* Bild/Result Card */}
      <div className="relative h-[360px] overflow-hidden rounded-2xl border border-border bg-background shadow-sm">

        <div
          className={`flex h-full w-full ${showRecipe ? 'items-start justify-start p-5 overflow-y-auto space-y-4 flex-col' : 'items-center justify-center'} `}
        >
          {showSpinner ? (
            <Spinner />
          ) : showRecipe ? (
            <div className="flex flex-col gap-4">
              <div className="text-lg font-semibold">{recipeTitle}</div>

              {(recipeJson?.portions || recipeJson?.duration_minutes) && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {recipeJson?.portions && <span>Portionen: {recipeJson.portions}</span>}
                  {recipeJson?.duration_minutes && <span>Dauer: {recipeJson.duration_minutes} min</span>}
                </div>
              )}

              {hasStructuredRecipeData ? (
                <>
                  {ingredients.length > 0 && (
                    <div>
                      <div className="mb-1 font-semibold">Zutaten</div>
                      <ul className="ml-4 flex list-disc flex-col gap-1.5">
                        {ingredients.map((ing, idx) => (
                          <li key={idx} className="text-sm leading-6">
                            {formatIngredientLine(ing)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {steps.length > 0 && (
                    <div>
                      <div className="mb-1 font-semibold">Schritte</div>
                      <ol className="ml-5 flex list-decimal flex-col gap-2">
                        {steps.map((step, idx) => {
                          const meta = getStepMeta(step)
                          const notes = getStepNotes(step)
                          return (
                            <li key={idx} className="text-sm leading-6">
                              <div>{getStepText(step, idx)}</div>
                              {meta && <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>}
                              {notes && (
                                <div className="mt-0.5 text-xs text-muted-foreground">Hinweis: {notes}</div>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Keine strukturierten Rezeptdaten gefunden.</div>
              )}

              {recipeId && (
                <div>
                  <Link href={`/recipes/${recipeId}`} className="text-sm text-primary underline underline-offset-4">
                    Zum vollständigen Rezept
                  </Link>
                </div>
              )}
            </div>
          ) : hasPreview ? (
            <div className="relative h-full w-full">
              <Image
                src={preview as string}
                alt="Vorschau"
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="px-6 text-center text-muted-foreground">
              <p className="text-base">Lade ein Bild von einem Rezept hoch</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 sm:gap-4">
        <div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl">
            Rezept hochladen
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onPickFromDisk(f)
            }}
            hidden
          />
        </div>

        <div>
          <CameraButton onPick={onPickFromDisk} label="Rezept fotografieren" />
        </div>

        <div className="col-span-2 grid gap-2">
          <label className="text-sm text-foreground/80">Thermomix Version</label>
          <select
            value={tmVersion || ''}
            onChange={e => {
              const v = (e.target.value || 't6') as 't5' | 't6' | 't7'
              setTmVersion(v)
              saveThermomixVersion(v)
            }}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring/50"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            <option value="t5">TM5</option>
            <option value="t6">TM6</option>
            <option value="t7">TM7</option>
          </select>
          {tmSaveInfo && <div className="text-xs text-muted-foreground">{tmSaveInfo}</div>}
        </div>

        <div className="col-span-2">
          <Button onClick={onSubmit} disabled={!file || isPolling} className="h-11 w-full rounded-xl">
            Abschicken
          </Button>
        </div>
      </div>

      {/* Status/Fehler */}
      {status && <div className="text-sm text-foreground/80">Status: {status}</div>}
      {error && <div className="text-sm text-destructive">Fehler: {error}</div>}
      {recipeError && <div className="text-sm text-destructive">Rezeptfehler: {recipeError}</div>}
      {recipe && <div className="text-sm text-muted-foreground">Rezeptstatus: {recipe.status ?? 'unbekannt'}</div>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3">
      <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <div className="text-sm text-muted-foreground">Rezept wird verarbeitet…</div>
    </div>
  )
}

function formatIngredientLine(ingredient: Ingredient | string): string {
  if (typeof ingredient === 'string') return ingredient
  const parts: string[] = []
  if (ingredient.amount !== undefined && ingredient.amount !== null && ingredient.amount !== '') {
    parts.push(String(ingredient.amount))
  }
  if (ingredient.unit) parts.push(ingredient.unit)
  if (ingredient.name) {
    parts.push(ingredient.name)
  } else if (ingredient.text) {
    parts.push(ingredient.text)
  }

  let line = parts.join(' ').trim()
  if (!line) {
    line = ingredient.notes ?? 'Unbekannte Zutat'
  } else if (ingredient.notes) {
    line = `${line} (${ingredient.notes})`
  }
  return line
}

function getStepText(step: Step | string, index: number): string {
  if (typeof step === 'string') return step
  return (
    step.step ??
    step.instruction ??
    (typeof step.text === 'string' ? step.text : undefined) ??
    `Schritt ${index + 1}`
  )
}

function getStepMeta(step: Step | string): string | null {
  if (typeof step === 'string') return null
  const thermo = step.thermomix
  if (!thermo) return null
  const parts: string[] = []
  if (thermo.mode) parts.push(`Modus: ${thermo.mode}`)
  if (thermo.temp_c !== undefined && thermo.temp_c !== null) parts.push(`Temp: ${thermo.temp_c}°C`)
  if (thermo.speed) parts.push(`Stufe: ${thermo.speed}`)
  if (thermo.time_seconds !== undefined && thermo.time_seconds !== null) {
    const minutes = Math.max(1, Math.round(thermo.time_seconds / 60))
    parts.push(`Zeit: ${minutes} min`)
  }
  return parts.length ? parts.join(' · ') : null
}

function getStepNotes(step: Step | string): string | null {
  if (typeof step === 'string') return null
  if (!step.notes) return null
  return String(step.notes)
}
