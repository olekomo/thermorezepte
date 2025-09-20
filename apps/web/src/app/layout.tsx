import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react' // ⬅️ hinzufügen

export const metadata: Metadata = {
  title: 'Web Skeleton',
  description: 'Phase 0 baseline',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // ⬅️ ReactNode statt React.ReactNode
  return (
    <html lang="de">
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
