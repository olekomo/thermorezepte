// app/page.tsx (Server Component)
import { headers } from 'next/headers'
import CameraCapture from './camera-capture'

export default async function AppPage() {
  const header = await headers()
  const ua = header.get('user-agent') || ''
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Foto aufnehmen / hochladen</h1>
      <CameraCapture isMobile={isMobile} />
    </main>
  )
}
