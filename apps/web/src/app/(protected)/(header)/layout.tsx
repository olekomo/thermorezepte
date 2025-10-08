import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import AccountDropDownMenu from '@/components/AccountDropDownMenu'
import { Header } from '@/components/layout/Header'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import LoggedInLeftHeaderComponent from './LoggedInLeftHeaderComponent'

export default async function Layout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()
  if (!user) {
    redirect('/log-in/password')
  }
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        left={<LoggedInLeftHeaderComponent user={user} />}
        right={<AccountDropDownMenu user={user?.email}></AccountDropDownMenu>}
      />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-screen-lg lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
