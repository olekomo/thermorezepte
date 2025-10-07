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
    <div
      style={{
        padding: 24,
        maxWidth: 420,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          position: 'relative',
          border: '1px solid #E2E2E2',
          borderRadius: 12,
          height: 360,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 999,
            background: '#F3F3F3',
            border: '1px solid #E2E2E2',
            textTransform: 'capitalize',
          }}
        >
          Bild
        </div>

        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: showRecipe ? 'stretch' : 'center',
            justifyContent: showRecipe ? 'flex-start' : 'center',
            padding: showRecipe ? 20 : 0,
            overflowY: showRecipe ? 'auto' : 'hidden',
            gap: showRecipe ? 16 : 0,
          }}
        >
          {showSpinner ? (
            <Spinner />
          ) : showRecipe ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{recipeTitle}</div>

              {(recipeJson?.portions || recipeJson?.duration_minutes) && (
                <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#555' }}>
                  {recipeJson?.portions && <span>Portionen: {recipeJson.portions}</span>}
                  {recipeJson?.duration_minutes && (
                    <span>Dauer: {recipeJson.duration_minutes} min</span>
                  )}
                </div>
              )}

              {hasStructuredRecipeData ? (
                <>
                  {ingredients.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Zutaten</div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {ingredients.map((ing, idx) => (
                          <li key={idx} style={{ fontSize: 14 }}>
                            {formatIngredientLine(ing)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {steps.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Schritte</div>
                      <ol
                        style={{
                          margin: 0,
                          paddingLeft: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {steps.map((step, idx) => {
                          const meta = getStepMeta(step)
                          const notes = getStepNotes(step)
                          return (
                            <li key={idx} style={{ fontSize: 14, lineHeight: 1.5 }}>
                              <div>{getStepText(step, idx)}</div>
                              {meta && (
                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                                  {meta}
                                </div>
                              )}
                              {notes && (
                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                                  Hinweis: {notes}
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 14, color: '#666' }}>
                  Keine strukturierten Rezeptdaten gefunden.
                </div>
              )}

              {recipeId && (
                <div>
                  <Link
                    href={`/recipes/${recipeId}`}
                    style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 14 }}
                  >
                    Zum vollständigen Rezept
                  </Link>
                </div>
              )}
            </div>
          ) : hasPreview ? (
            <Image
              src={preview as string}
              alt="Vorschau"
              width={320}
              height={320}
              style={{ objectFit: 'contain', maxHeight: '100%' }}
            />
          ) : (
            <div style={{ color: '#555', fontSize: 16, textAlign: 'center', padding: '0 24px' }}>
              Laden Sie ein Bild von einem Rezept hoch
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 8,
        }}
      >
        <div>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%' }}
          >
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
          <CameraButton
            onPick={onPickFromDisk}
            label="Rezept fotografieren"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14 }}>Thermomix Version</label>
          <select
            value={tmVersion || ''}
            onChange={e => {
              const v = (e.target.value || 't6') as 't5' | 't6' | 't7'
              setTmVersion(v)
              saveThermomixVersion(v)
            }}
            style={{
              height: 40,
              borderRadius: 8,
              border: '1px solid #E2E2E2',
              padding: '0 10px',
              background: '#fff',
            }}
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            <option value="t5">TM5</option>
            <option value="t6">TM6</option>
            <option value="t7">TM7</option>
          </select>
          {tmSaveInfo && <div style={{ fontSize: 12, color: '#666' }}>{tmSaveInfo}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'end' }}>
          <Button onClick={onSubmit} disabled={!file || isPolling} style={{ width: '100%' }}>
            Abschicken
          </Button>
        </div>
      </div>

      {status && <div>Status: {status}</div>}
      {error && <div style={{ color: 'red' }}>Fehler: {error}</div>}
      {recipeError && <div style={{ color: 'red' }}>Rezeptfehler: {recipeError}</div>}
      {recipe && (
        <div style={{ color: '#666', fontSize: 14 }}>
          Rezeptstatus: {recipe.status ?? 'unbekannt'}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid #d1d5db',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'recipe-spin 1s linear infinite',
        }}
      />
      <div style={{ fontSize: 14, color: '#555' }}>Rezept wird verarbeitet…</div>
      <style>{`
        @keyframes recipe-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
