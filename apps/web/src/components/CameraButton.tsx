'use client'
import { useRef } from 'react'
import { Button } from './ui/button'

type Props = {
  // eslint-disable-next-line no-unused-vars
  onPick?: (file: File) => void // hier kannst du uploaden/anzeigen/navigieren
  label: string
  style?: React.CSSProperties
}

export default function CameraButton({ onPick, label, style }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <Button onClick={() => inputRef.current?.click()} style={style}>
        {label}
      </Button>

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
