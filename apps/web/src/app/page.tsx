import { Button } from '@/components/ui/button'
import { supabaseServerRSC } from '@/lib/supabase/server-rsc'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'

export default async function HomePage() {
  const s = await supabaseServerRSC()
  const {
    data: { user },
  } = await s.auth.getUser()

  return (
    <div className="space-y-4">
      <Header
        title=""
        left={
          user ? (
            <Link href="/login">
              <Image src="/globe.svg" alt="" width={30} height={30} priority />
            </Link>
          ) : (
            <Link href="/">Home</Link>
          )
        }
        right={
          user ? (
            <p>{user?.email}</p>
          ) : (
            <Button size="sm">
              <Link href="/login">Anmelden</Link>
            </Button>
          )
        }
        maxWidth="sm" // später: md/lg für Desktop
        position="sticky"
        bordered
      />
    </div>
  )
}
