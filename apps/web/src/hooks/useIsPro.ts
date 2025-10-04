import { useEffect, useState } from 'react'

export function useIsPro() {
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/me/is-pro', { cache: 'no-store' })
        const json = await res.json()
        if (alive) setIsPro(Boolean(json?.isPro))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { isPro, loading }
}
