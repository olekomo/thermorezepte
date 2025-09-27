'use client'
import { useCallback, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useFilePicker, compressImage } from '@/hooks/useFilePicker'
import { useCameraStream } from '@/hooks/useCameraStream'

type Status = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const { file, previewUrl, onPickFile, clear } = useFilePicker()
  const { videoRef, startCamera, stopStream, isRunning } = useCameraStream()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

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
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Nicht eingeloggt.')

      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('raw_uploads')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr

      setStatus('done')
      clear()
    } catch (e: any) {
      setStatus('error')
      setError(e?.message ?? 'Unbekannter Fehler')
    }
  }, [file, clear])

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
            <button
              onClick={startCamera}
              disabled={isRunning}
              className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {isRunning ? 'Kamera läuft' : 'Kamera starten'}
            </button>

            {/* Optionaler Stop-Button – hilfreich für Tests/Privacy */}
            <button
              onClick={stopStream}
              disabled={!isRunning}
              className="rounded-2xl px-4 py-2 bg-white text-black border shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
              : 'Konvertieren (Upload)'}
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
