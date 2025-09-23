import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export default async function Home() {
  const s = await supabaseServerRSC() // <-- await!
  const {
    data: { user },
  } = await s.auth.getUser()

  return (
    <main style={{ padding: 24 }}>
      {user ? (
        <>
          <p>Angemeldet als {user.email}</p>
          <form action="/logout" method="post">
            <button>Logout</button>
          </form>
        </>
      ) : (
        <a href="/login">Einloggen</a>
      )}
    </main>
  )
}
