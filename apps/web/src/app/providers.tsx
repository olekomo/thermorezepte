'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}
