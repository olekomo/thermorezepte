import type { ReactNode } from 'react'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AccountDropDownMenu from '@/components/AccountDropDownMenu'

export default async function Layout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()
  return (
    <>
      <Header
        right={
          user ? (
            <AccountDropDownMenu user={user.email}></AccountDropDownMenu>
          ) : (
            <Button>
              <Link href="/log-in-or-create-account">Anmelden</Link>
            </Button>
          )
        }
      />
      {children}
    </>
  )
}
