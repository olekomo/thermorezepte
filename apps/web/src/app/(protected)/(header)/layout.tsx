import type { ReactNode } from 'react'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import AccountDropDownMenu from '@/components/AccountDropDownMenu'
import LoggedInLeftHeaderComponent from './LoggedInLeftHeaderComponent'
import { redirect } from 'next/navigation'

export default async function Layout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()
  if (!user) {
    redirect('/log-in/password')
  }
  return (
    <>
      <Header
        left={
            <LoggedInLeftHeaderComponent user={user} />
        }
        right={<AccountDropDownMenu user={user?.email}></AccountDropDownMenu>}
      />
      {children}
    </>
  )
}
