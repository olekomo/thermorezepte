'use client'
import { Button } from '@/components/ui/button'

export default function Page() {
  const test = async () => {
    await fetch('/api/test', { method: 'POST' })
  }
  return <Button onClick={test}>Was kann die App?</Button>
}
