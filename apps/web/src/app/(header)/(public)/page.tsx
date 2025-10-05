import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export default async function HomePage() {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()

  return (
    <div className="space-y-4">
      <p>{user?.email}</p>
    </div>
  )
}
