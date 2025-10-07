// app/camera-capture.tsx (Client Component)
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { isMobile: boolean }

export default function CameraCapture({ isMobile }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  async function startCamera() {
    setError(null)
    setPhotoDataUrl(null)

    // Grund-Constraints: Mobile → environment, Desktop → user
    const baseFacing = isMobile ? 'environment' : 'user'
    let constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: baseFacing }, // Safari iOS versteht ideal, ggf. exact als Fallback
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      attachStream(s)
      // Prüfen, ob wir tatsächlich die gewünschte Kamera erwischt haben (optional)
      await ensureFacingMode(baseFacing, s)
    } catch {
      // Fallback 1: mit exact probieren (iOS braucht das manchmal)
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: baseFacing } as any },
          audio: false,
        })
        attachStream(s)
      } catch {
        // Fallback 2: nach Freigabe Geräte auflisten und "back"/"front" suchen (Desktop & iOS nach Permission)
        try {
          const deviceId = await pickDeviceByLabel(isMobile ? /back|rear/i : /front|user|webcam/i)
          if (!deviceId) throw new Error('Keine passende Kamera gefunden.')
          const s = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false,
          })
          attachStream(s)
        } catch (e3: any) {
          setError(e3?.message || 'Kamera konnte nicht gestartet werden.')
        }
      }
    }
  }

  function attachStream(s: MediaStream) {
    if (stream) stream.getTracks().forEach(t => t.stop())
    setStream(s)
    if (videoRef.current) {
      videoRef.current.srcObject = s
      // iOS: autoplay benötigt muted + playsInline und oft einen User-Gesture (Button)
      videoRef.current.play().catch(() => {
        /* ignorieren */
      })
    }
  }

  async function ensureFacingMode(wanted: 'environment' | 'user', s: MediaStream) {
    const track = s?.getVideoTracks?.()[0]
    if (!track) {
      console.warn('Keine Video-Track gefunden – FacingMode kann nicht geprüft werden.')
      return
    }

    const settings = track.getSettings?.() ?? {}
    const currentMode = settings.facingMode

    if (!currentMode) {
      // facingMode wird nicht von allen Browsern gesetzt – kein Fehler.
      return
    }

    if (currentMode !== wanted) {
      console.warn(`Gewünschte Kamera (${wanted}) ≠ aktive (${currentMode})`)
      // Optional: hier könnte man bei Bedarf automatisch umschalten,
      // z. B. per enumerateDevices() + getUserMedia(deviceId: …)
    }
  }

  async function pickDeviceByLabel(regex: RegExp) {
    // enumerateDevices liefert Labels erst NACH einer erfolgreichen Permission
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter(d => d.kind === 'videoinput')
    // Suche nach "back"/"rear" für Handy hinten, "front"/"user"/"webcam" für Desktop/Front
    const preferred = videoInputs.find(d => regex.test(d.label))
    return preferred?.deviceId || videoInputs[0]?.deviceId
  }

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPhotoDataUrl(dataUrl)
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop())
    setStream(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={startCamera} className="px-3 py-2 rounded bg-black text-white">
          Kamera starten
        </button>
        <button onClick={stopCamera} className="px-3 py-2 rounded border">
          Stop
        </button>
        <button onClick={takePhoto} className="px-3 py-2 rounded border" disabled={!stream}>
          Foto aufnehmen
        </button>
      </div>

      {/* Alternative Upload (Mobile: öffnet i.d.R. Kamera) */}
      <div>
        <label className="block text-sm font-medium mb-1">Oder Bild hochladen / aufnehmen:</label>
        <input
          type="file"
          accept="image/*"
          capture={isMobile ? 'environment' : undefined}
          className="block"
          onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            const url = URL.createObjectURL(file)
            setPhotoDataUrl(url)
          }}
        />
        <p className="text-xs text-gray-500 mt-1">
          Auf dem Handy erzwingt <code>capture="environment"</code> meist die Außenkamera
          (Browser-/OS-abhängig).
        </p>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-xl rounded border" />
      <canvas ref={canvasRef} className="hidden" />

      {photoDataUrl && (
        <div>
          <p className="mb-2">Aufgenommenes / ausgewähltes Bild:</p>
          <img src={photoDataUrl} alt="snapshot" className="w-full max-w-xl rounded border" />
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}
