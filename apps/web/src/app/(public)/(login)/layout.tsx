import './../../globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react' // ⬅️ hinzufügen

export const metadata: Metadata = {
  title: 'ThermoRezepte',
  description: 'Die besten Thermomix-Rezepte',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <html lang="de">
        <body className="min-h-dvh">
          <div> x</div>
          <div>{children}</div>
        </body>
      </html>
    </>
  )
}
