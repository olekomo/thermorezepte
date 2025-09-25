// Erklärung:
// Client-Komponente mit Datei-Input (capture=environment), optional Desktop-Kamera-Fallback,
// Preview + Upload (inkl. Kompression & EXIF-Stripping via Canvas).

'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

type Status = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [usingCamera, setUsingCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [stream, previewUrl])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setUsingCamera(false)
    setError(null)
    setStatus('idle')
  }

  // Desktop-Fallback: getUserMedia
  const startCamera = async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(s)
      setUsingCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
    } catch {
      setError('Kamera konnte nicht gestartet werden.')
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92),
    )
    const f = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setError(null)
    setStatus('idle')
  }

  // Kompression + EXIF-Strip (Canvas)
  const compressImage = async (input: File, maxDim = 2048, quality = 0.8): Promise<Blob> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = URL.createObjectURL(input)
    })

    const { width, height } = img
    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, targetW, targetH)

    // EXIF wird beim Canvas-Export entfernt
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', quality),
    )
  }

  const upload = async () => {
    try {
      setError(null)
      if (!file) throw new Error('Kein Bild ausgewählt.')
      setStatus('compressing')
      const compressed = await compressImage(file, 2048, 0.82)

      setStatus('uploading')
      const {
        data: { user },
        error: userErr,
      } = await supabaseBrowser().auth.getUser()
      if (userErr || !user) throw new Error('Nicht eingeloggt.')

      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabaseBrowser()
        .storage.from('raw_uploads')
        .upload(path, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (upErr) throw upErr

      setStatus('done')
    } catch (e: any) {
      setStatus('error')
      setError(e.message ?? 'Unbekannter Fehler')
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upload / Kamera</h1>

      <div className="flex gap-3">
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

        <button
          className="px-4 py-2 rounded-xl bg-gray-200"
          onClick={startCamera}
          disabled={usingCamera}
        >
          Foto machen (Desktop Fallback)
        </button>

        <button
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          onClick={upload}
          disabled={!file || status === 'compressing' || status === 'uploading'}
        >
          {status === 'uploading'
            ? 'Lade hoch…'
            : status === 'compressing'
              ? 'Komprimiere…'
              : 'Konvertieren (Upload)'}
        </button>
      </div>

      {usingCamera && (
        <div className="space-y-2">
          <video ref={videoRef} className="w-full rounded-xl bg-black" playsInline muted />
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-gray-200" onClick={captureFrame}>
              Frame übernehmen
            </button>
            <button
              className="px-4 py-2 rounded-xl"
              onClick={() => {
                stream?.getTracks().forEach((t) => t.stop())
                setUsingCamera(false)
                setStream(null)
              }}
            >
              Kamera stoppen
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Vorschau (EXIF wird beim Upload entfernt, max. 2048px lange Kante)
          </p>
          <img src={previewUrl} alt="Preview" className="rounded-xl max-h-[50vh] object-contain" />
        </div>
      )}

      {status === 'done' && (
        <p className="text-green-700">
          Upload erfolgreich! Du findest die Datei in deiner History.
        </p>
      )}
      {status === 'error' && <p className="text-red-600">Fehler: {error}</p>}
    </main>
  )
}
