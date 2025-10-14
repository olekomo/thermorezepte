'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useFilePicker, compressImage } from '@/hooks/useFilePicker'
import { useCameraStream } from '@/hooks/useCameraStream'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

export default function AppPage() {
  const { file, previewUrl, onPickFile, setWithPreview, clear } = useFilePicker()
  const { videoRef, startCamera, stopStream, isRunning, cameraError, capturePhoto } =
    useCameraStream()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const [imagePath, setImagePath] = useState<string | null>(null)
  const [recipeRow, setRecipeRow] = useState<any | null>(null)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const handleCapture = useCallback(async () => {
    setCaptureError(null)
    try {
      setIsCapturing(true)
      const photo = await capturePhoto()
      setWithPreview(photo)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Foto konnte nicht aufgenommen werden.'
      setCaptureError(message)
    } finally {
      setIsCapturing(false)
    }
  }, [capturePhoto, setWithPreview])

  const upload = useCallback(async () => {
    try {
      setError(null)
      if (!file) throw new Error('Kein Bild ausgewählt.')
      setStatus('compressing')
      const compressed = await compressImage(file, 2048, 0.82)

      setStatus('uploading')
      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // ADD: anonyme Anmeldung, falls nicht eingeloggt (erfordert aktivierten Anonymous-Provider)
        const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
        if (anonErr || !anonData?.user) throw new Error('Login erforderlich.')
      }

      // danach den User noch einmal holen (kann identisch sein, wenn schon eingeloggt)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Nicht eingeloggt.')

      // CHANGE – deinen path beibehalten, aber anschließend vollständigen imagePath setzen
      const path = `${currentUser.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('raw_uploads')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr

      // ADD – wichtig: vollständiger Pfad inkl. Bucket für den späteren DB-Lookup
      setImagePath(`raw_uploads/${path}`)
      setStatus('done')
      setIsPolling(true) // Polling einschalten
      clear()
    } catch (e: any) {
      setStatus('error')
      setError(e?.message ?? 'Unbekannter Fehler')
    }
  }, [file, clear])

  // ADD (irgendwo unterhalb der useCallbacks)
  useEffect(() => {
    if (!imagePath || !isPolling) return
    let cancelled = false
    let timer: number | null = null
    const supabase = supabaseBrowser()
    const startedAt = Date.now()
    const pollMs = 2000
    const maxMs = 120000

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
        return
      }

      if (data) {
        setRecipeRow(data)
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

      timer = window.setTimeout(tick, pollMs) as unknown as number
    }

    tick()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [imagePath, isPolling])

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upload / Kamera</h1>

      <div className="flex flex-wrap gap-3">
        <label className="px-4 py-2 rounded-xl bg-gray-200 cursor-pointer">
          Bild wählen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickFile}
            className="hidden"
          />
        </label>

        <div className="w-full max-w-2xl space-y-4">
          <h1 className="text-2xl font-semibold">Webcam Demo</h1>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setCaptureError(null)
                startCamera()
              }}
              disabled={isRunning}
              className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {isRunning ? 'Kamera läuft' : 'Kamera starten'}
            </Button>

            {/* Optionaler Stop-Button – hilfreich für Tests/Privacy */}
            <Button
              onClick={stopStream}
              disabled={!isRunning}
              className="rounded-2xl px-4 py-2 bg-white text-black border shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop
            </Button>

            <Button
              onClick={handleCapture}
              disabled={!isRunning || isCapturing}
              className="rounded-2xl px-4 py-2 bg-emerald-600 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? 'Foto wird erstellt…' : 'Foto aufnehmen'}
            </Button>
          </div>

          {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
          {captureError && <p className="text-sm text-red-600">{captureError}</p>}

          <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden shadow">
            <video
              ref={videoRef}
              // Autoplay + playsInline sind wichtig für iOS/Safari
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>

          <p className="text-sm text-gray-500">
            Hinweis: Beim ersten Start fragt der Browser nach Kamerazugriff. Erteile die
            Berechtigung, damit das Live‑Bild angezeigt werden kann.
          </p>
        </div>

        <button
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          onClick={upload}
          type="button"
          disabled={!file || status === 'compressing' || status === 'uploading'}
        >
          {status === 'uploading'
            ? 'Lade hoch…'
            : status === 'compressing'
              ? 'Komprimiere…'
              : 'Hochladen & konvertieren'}
        </button>
      </div>

      <div aria-live="polite" className="min-h-[1.5rem] text-sm text-gray-600">
        {status === 'compressing' && 'Bild wird komprimiert…'}
        {status === 'uploading' && 'Upload läuft…'}
      </div>

      {previewUrl && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Vorschau (EXIF wird beim Upload entfernt, max. 2048px lange Kante)
          </p>
          <img src={previewUrl} alt="Preview" className="rounded-xl max-h-[50vh] object-contain" />
        </div>
      )}

      {imagePath && (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">
            Warte auf Konvertierung für <code>{imagePath}</code> …
          </div>
          {isPolling && <div>Verarbeite…</div>}
          {recipeError && <div className="text-red-600">Fehler: {recipeError}</div>}
          {recipeRow?.status === 'error' && (
            <div className="text-red-600">Serverfehler: {recipeRow.error ?? 'unbekannt'}</div>
          )}
          {recipeRow?.status === 'done' && (
            <div className="rounded-xl border p-4">
              <h2 className="text-xl font-semibold mb-2">
                {recipeRow.title ?? recipeRow.recipe_json?.title ?? 'Rezept'}
              </h2>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <b>Portionen:</b> {recipeRow.recipe_json?.portions ?? '-'}
                </div>
                <div>
                  <b>Dauer (Min):</b> {recipeRow.recipe_json?.duration_minutes ?? '-'}
                </div>
              </div>

              {Array.isArray(recipeRow.recipe_json?.ingredients) && (
                <>
                  <h3 className="mt-3 font-semibold">Zutaten</h3>
                  <ul className="list-disc pl-5">
                    {recipeRow.recipe_json.ingredients.map((ing: any, i: number) => (
                      <li key={i}>
                        {ing.amount ? `${ing.amount} ` : ''}
                        {ing.name}
                        {ing.notes ? ` (${ing.notes})` : ''}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {Array.isArray(recipeRow.recipe_json?.steps) && (
                <>
                  <h3 className="mt-3 font-semibold">Schritte (Thermomix)</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    {recipeRow.recipe_json.steps.map((s: any, i: number) => (
                      <li key={i}>
                        {s.step}
                        {s.thermomix && (
                          <div className="text-xs text-gray-600">
                            {[
                              s.thermomix.mode && `Modus: ${s.thermomix.mode}`,
                              (s.thermomix.temp_c ?? null) !== null &&
                                `Temp: ${s.thermomix.temp_c}°C`,
                              s.thermomix.speed && `Stufe: ${s.thermomix.speed}`,
                              (s.thermomix.time_seconds ?? null) !== null &&
                                `Zeit: ${Math.round(s.thermomix.time_seconds / 60)} min`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <details className="mt-3">
                <summary>Roh-JSON anzeigen</summary>
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(recipeRow.recipe_json, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <p className="text-green-700" role="status" aria-live="polite">
          Upload erfolgreich! Du findest die Datei in deiner History.
        </p>
      )}
      {status === 'error' && (
        <p className="text-red-600" role="alert">
          Fehler: {error}
        </p>
      )}
    </main>
  )
}
