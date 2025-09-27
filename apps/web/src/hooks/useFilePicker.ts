// file: hooks/useFilePicker.ts
'use client'
import { useCallback, useEffect, useState } from 'react'

export type PickedFile = {
  file: File | null
  previewUrl: string | null
}

export function useFilePicker() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // revoke prev object URL on change/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const setWithPreview = useCallback((nextFile: File | null) => {
    setFile(nextFile)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextFile ? URL.createObjectURL(nextFile) : null
    })
  }, [])

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      setWithPreview(f)
    },
    [setWithPreview],
  )

  const clear = useCallback(() => setWithPreview(null), [setWithPreview])

  return { file, previewUrl, onPickFile, setWithPreview, clear }
}

// Optional: image compression util kept next to file picker for cohesion
export async function compressImage(input: File, maxDim = 2048, quality = 0.82): Promise<Blob> {
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

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht komprimiert werden.'))),
      'image/jpeg',
      quality,
    ),
  )
}
