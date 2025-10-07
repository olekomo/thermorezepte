'use client'
import { useRef } from 'react'

type Props = {
  // eslint-disable-next-line no-unused-vars
  onPick?: (file: File) => void // hier kannst du uploaden/anzeigen/navigieren
}

export default function CameraButton({ onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        style={{ padding: '10px 16px', borderRadius: 8 }}
      >
        Foto aufnehmen
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onPick?.(file) // <-- wichtig, damit ESLint nicht meckert
        }}
      />
    </div>
  )
}
