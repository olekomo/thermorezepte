// Erklärung:
// Client-Komponente mit Datei-Input (capture=environment), optional Desktop-Kamera-Fallback,
// Preview + Upload (inkl. Kompression & EXIF-Stripping via Canvas).

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null)

  const checkCameraSupport = useCallback(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'

    setCameraSupported((prev) => (prev === supported ? prev : supported))
    return supported
  }, [])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    checkCameraSupport()
  }, [checkCameraSupport])

  const updateFileWithPreview = useCallback((nextFile: File | null) => {
    setFile(nextFile)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextFile ? URL.createObjectURL(nextFile) : null
    })
  }, [])

  const stopCamera = useCallback(() => {
    setStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.pause()
    }
    setUsingCamera(false)
  }, [])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    updateFileWithPreview(f)
    if (usingCamera) stopCamera()
    setError(null)
    setStatus('idle')
  }

  // Desktop-Fallback: getUserMedia
  const startCamera = async () => {
    setError(null)
    try {
      if (!checkCameraSupport()) {
        throw new Error('Dieses Gerät unterstützt keine Kamera-Aufnahme im Browser.')
      }

      stopCamera()

      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(s)
      setUsingCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .catch((err) => console.error('Video play error:', err))
        }
      }
    } catch (err) {
      console.error(err)
      stopCamera()
      setError('Kamera konnte nicht gestartet werden.')
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current) return
    try {
      const video = videoRef.current
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('Video stream noch nicht bereit')
        setError('Bitte warte einen Moment, bis das Kamerabild verfügbar ist.')
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar.')
      ctx.drawImage(video, 0, 0)
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => {
          if (!b) {
            reject(new Error('Konnte Kamerabild nicht verarbeiten.'))
            return
          }
          resolve(b)
        }, 'image/jpeg', 0.92),
      )
      const f = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      updateFileWithPreview(f)
      setError(null)
      setStatus('idle')
    } catch (err) {
      console.error(err)
      setError('Frame konnte nicht übernommen werden.')
    }
  }

  // Kompression + EXIF-Strip (Canvas)
  const compressImage = async (input: File, maxDim = 2048, quality = 0.8): Promise<Blob> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      const objectUrl = URL.createObjectURL(input)
      image.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(image)
      }
      image.onerror = (ev) => {
        URL.revokeObjectURL(objectUrl)
        reject(ev)
      }
      image.src = objectUrl
    })

    const { width, height } = img
    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar.')
    ctx.drawImage(img, 0, 0, targetW, targetH)

    // EXIF wird beim Canvas-Export entfernt
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => {
        if (!b) {
          reject(new Error('Bild konnte nicht komprimiert werden.'))
          return
        }
        resolve(b)
      }, 'image/jpeg', quality),
    )
  }

  const upload = async () => {
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
      const { error: upErr } = await supabase
        .storage.from('raw_uploads')
        .upload(path, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (upErr) throw upErr

      setStatus('done')
      updateFileWithPreview(null)
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
          type="button"
          disabled={usingCamera || cameraSupported === false}
        >
          Foto machen (Desktop Fallback)
        </button>

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

      {usingCamera && (
        <div className="space-y-2">
          <video ref={videoRef} className="w-full rounded-xl bg-black" playsInline muted />
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-200"
              onClick={captureFrame}
              type="button"
            >
              Frame übernehmen
            </button>
            <button className="px-4 py-2 rounded-xl" onClick={stopCamera} type="button">
              Kamera stoppen
            </button>
          </div>
        </div>
      )}

      {cameraSupported === false && (
        <p className="text-sm text-amber-700">
          Dein Gerät oder Browser unterstützt keine Kamera-Aufnahme über den Desktop-Fallback.
        </p>
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
