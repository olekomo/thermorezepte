import { supabaseServerRSC } from '@/lib/supabase/server-rsc'

export default async function Recipes() {
  const s = await supabaseServerRSC() // <-- await!
  const {
    data: { user },
  } = await s.auth.getUser()
  if (!user)
    return (
      <div>
        Bitte <a href="/login">einloggen</a>.
      </div>
    )

  const { data, error } = await s
    .from('recipes')
    .select('id,title,visibility,user_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div style={{ padding: 24 }}>
      <h1>Rezepte</h1>
      {error && <p>Fehler: {error.message}</p>}
      <ul>
        {data?.map((r) => (
          <li key={r.id}>
            {r.title} — {r.visibility} — owner: {r.user_id}
          </li>
        ))}
      </ul>
    </div>
  )
}
