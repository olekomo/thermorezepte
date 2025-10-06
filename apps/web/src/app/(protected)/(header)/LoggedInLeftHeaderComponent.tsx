import { User } from '@supabase/supabase-js'

export default function LoggedInLeftHeaderComponent({ user }: { user: User | null }) {
  return <div>{user?.aud}</div>
}
