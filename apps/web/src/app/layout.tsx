import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Thermorezepte – Rezeptfotos → Cookidoo-Anleitungen',
  description:
    'Mach aus Rezeptfotos echte, strukturierte Thermomix-Anleitungen – schnell, klar und teilbar.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
