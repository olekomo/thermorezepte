'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) {
      throw new Error('Kein Videoelement verfügbar.')
    }

    if (!isRunning || !streamRef.current) {
      throw new Error('Kamera ist nicht aktiv.')
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      throw new Error('Video ist noch nicht bereit.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas-Kontext nicht verfügbar.')
    }

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )

    if (!blob) {
      throw new Error('Foto konnte nicht aufgenommen werden.')
    }

    return new File([blob], `camera-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })
  }, [isRunning])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsRunning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)

    if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('getUserMedia wird von diesem Browser nicht unterstützt.')
      return
    }

    // Falls bereits ein Stream läuft, sauber beenden bevor ein neuer gestartet wird
    stopStream()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user', // Frontkamera, wenn verfügbar
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // iOS erfordert häufig einen direkten Play-Aufruf nach User-Geste
        await videoRef.current.play()
      }

      setIsRunning(true)
    } catch (err: unknown) {
      const message =
        (err as DOMException)?.message || 'Unbekannter Fehler beim Zugriff auf die Kamera.'
      setCameraError(message)
      stopStream()
    }
  }, [stopStream])

  // Beim Verlassen/Unmount sauber aufräumen
  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  return { videoRef, startCamera, stopStream, isRunning, cameraError, capturePhoto }
}
