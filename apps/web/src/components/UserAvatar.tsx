// app/_components/UserAvatar.tsx (Server Component)
import Image from 'next/image'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export default async function UserAvatar() {
  const supabase = await supabaseServerRSC()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const avatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture || // (Google liefert oft 'picture')
    null

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'User'

  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <Image src={avatar} alt={name} width={64} height={64} className="rounded-full" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}
