'use client'
import { supabaseBrowser } from '@/lib/supabase/browser'

export function GoogleSignInButton() {
  const onClick = async () => {
    const supabase = supabaseBrowser()
    const origin = window.location.origin

    // Ziel vorm Start als First-Party-Cookie merken (10 Min)
    document.cookie = `post_oauth_redirect=${encodeURIComponent('/app')}; Path=/; Max-Age=600; SameSite=Lax`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback`, // kein state!
      },
    })
  }

  return <button onClick={onClick}>Mit Google anmelden</button>
}
