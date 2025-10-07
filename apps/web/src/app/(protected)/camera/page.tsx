'use client'
import Image from 'next/image'
import { useState } from 'react'
import CameraButton from './CameraButton'

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null)

  return (
    <main style={{ padding: 24 }}>
      <CameraButton
        onPick={file => {
          // Vorschau
          const url = URL.createObjectURL(file)
          setPreview(url)

          // TODO: optional Upload starten (z.B. via Route Handler /api/upload)
        }}
      />

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Image src={preview} alt="Aufgenommen" width={320} height={240} />
        </div>
      )}
    </main>
  )
}
