import type { ReactNode } from 'react'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AccountDropDownMenu from '@/components/AccountDropDownMenu'
import LoggedInLeftHeaderComponent from './LoggedInLeftHeaderComponent'

export default async function Layout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()
  return (
    <>
      <Header
        left={
          user ? (
            <Button>
              <LoggedInLeftHeaderComponent user={user} />
            </Button>
          ) : (
            <Button>
              <Link href="/log-in-or-create-account">logo</Link>
            </Button>
          )
        }
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
