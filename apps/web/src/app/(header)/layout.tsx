import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()
  return (
    <>
      <Header
        title=""
        left={
          user ? (
            <Link href="/login">
              <Image src="/globe.svg" alt="" width={30} height={30} priority />
            </Link>
          ) : (
            <Link href="/">Home</Link>
          )
        }
        right={
          user ? (
            <p>{user?.email}</p>
          ) : (
            <Button size="sm">
              <Link href="/login">Anmelden</Link>
            </Button>
          )
        }
        maxWidth="sm" // später: md/lg für Desktop
        position="sticky"
        bordered
      />
      {children}
    </>
  )
}
