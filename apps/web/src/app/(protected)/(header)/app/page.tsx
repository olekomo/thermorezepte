'use client'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import CameraButton from '@/components/CameraButton'
import { compressImage } from '@/hooks/useCompressImage'
import { supabaseBrowser } from '@/lib/supabase/browser'

type RecipeRow = {
  status?: 'pending' | 'processing' | 'done' | 'error'
  result?: string
  error_message?: string
  [key: string]: unknown
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
      setIsPolling(true)
      setStatus('Bild wird verarbeitet…')
    } catch (e: any) {
      console.error('Submit error', e)
      setIsPolling(false)
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
        setRecipe(data)
        if (data.status === 'done') setStatus('Rezept erstellt.')
        if (data.status === 'error') {
          const message =
            typeof data.error_message === 'string'
              ? data.error_message
              : 'Fehler beim Erstellen des Rezepts.'
          setRecipeError(message)
          setStatus(null)
        }
        if (data.status === 'done' || data.status === 'error') {
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

  // --- UI (angepasst wie Screenshot) ---
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
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Was kann die App?</div>
        <div style={{ marginTop: 8, color: '#666' }}>oder</div>
      </div>

      {/* Bild-Box */}
      <div
        style={{
          position: 'relative',
          border: '1px solid #E2E2E2',
          borderRadius: 12,
          height: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          }}
        >
          bild
        </div>

        {preview ? (
          <Image
            src={preview}
            alt="Vorschau"
            width={320}
            height={320}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div style={{ color: '#999' }}>Noch kein Bild gewählt</div>
        )}
      </div>

      {/* Untere Aktionen – 2 Spalten, 2 Reihen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 8,
        }}
      >
        {/* links oben: Rezept hochladen */}
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

        {/* rechts oben: Rezept fotografieren */}
        <div>
          <CameraButton
            onPick={f => {
              const url = URL.createObjectURL(f)
              setFile(f)
              setPreview(url)
            }}
            label="Rezept fotografieren"
            style={{ width: '100%' } as any}
          />
        </div>

        {/* links unten: Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14 }}>Thermomix Version</label>
          <select
            value={tmVersion || ''}
            onChange={e => {
              const v = (e.target.value || 't6') as 't5' | 't6' | 't7'
              setTmVersion(v)
              // sofort speichern
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

        {/* rechts unten: Abschicken */}
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <Button onClick={onSubmit} disabled={!file || isPolling} style={{ width: '100%' }}>
            Abschicken
          </Button>
        </div>
      </div>

      {/* Status & Fehler */}
      {isPolling && <div>Warte auf Rezept…</div>}
      {status && <div>Status: {status}</div>}
      {error && <div style={{ color: 'red' }}>Fehler: {error}</div>}
      {recipeError && <div style={{ color: 'red' }}>Rezeptfehler: {recipeError}</div>}

      {recipe && (
        <div style={{ marginTop: 16 }}>
          <div>Rezeptstatus: {recipe.status ?? 'unbekannt'}</div>
          {recipe.result && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {typeof recipe.result === 'string'
                ? recipe.result
                : JSON.stringify(recipe.result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
