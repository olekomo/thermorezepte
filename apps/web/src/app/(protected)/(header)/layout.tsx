import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { supabaseServerRSC } from '@/lib/supabase/server-rsc';
import AccountDropDownMenu from '@/components/AccountDropDownMenu';
import LoggedInLeftHeaderComponent from './LoggedInLeftHeaderComponent';

export default async function Layout({ children }: { children: ReactNode }) {
  const s = await supabaseServerRSC();
  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    redirect('/log-in/password');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        maxWidth="full"
        position="sticky"
        height="auto"
        contentClassName="py-3 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
        left={<LoggedInLeftHeaderComponent user={user} />}
        right={<AccountDropDownMenu />}
      />

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-screen-lg lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
