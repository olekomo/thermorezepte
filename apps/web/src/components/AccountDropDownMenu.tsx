// app/_components/AccountDropDownMenu.tsx  (Server Component)
import { supabaseServerRSC } from '@/lib/supabase/server-rsc';
import AccountDropDownMenuClient from './AccountDropDownMenuClient';

export default async function AccountDropDownMenu() {
  const supabase = await supabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  return (
    <AccountDropDownMenuClient
      email={user.email ?? ''}
      name={metadata.full_name || metadata.name || ''}
      avatarUrl={metadata.avatar_url || metadata.picture || null}
    />
  );
}
