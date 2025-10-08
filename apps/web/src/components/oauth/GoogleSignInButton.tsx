'use client'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'

export function GoogleSignInButton() {
  const onClick = async () => {
    const supabase = supabaseBrowser()
    const origin = window.location.origin
    document.cookie = `post_oauth_redirect=${encodeURIComponent('/app')}; Path=/; Max-Age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/api/auth/callback` },
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} className="w-full justify-center gap-2">
      <img
        src="/google.svg" // leg das G z.B. in /public/google.svg
        alt="google logo"
        width={16}
        height={16}
        className="shrink-0 pointer-events-none select-none"
      />
      <span>Mit Google anmelden</span>
    </Button>
  )
}
