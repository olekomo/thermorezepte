import Image from 'next/image'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import { cn } from '@/lib/utils' // falls du shadcn/utils nutzt – sonst einfach entfernen

type Props = {
  className?: string
  size?: number // optional: z. B. 32, 40, 64 …
}

export default async function UserAvatar({ className, size = 40 }: Props) {
  const supabase = await supabaseServerRSC()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const avatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'User'

  const initials = name.charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full bg-muted text-foreground/70',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.35),
      }}
      title={name}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={size}
          height={size}
          className="object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
