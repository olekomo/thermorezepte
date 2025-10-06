import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
export default async function HomePage() {
  return (
    <>
      <Header
        left={
          <Button asChild>
            <Link href="/log-in-or-create-account">logo</Link>
          </Button>
        }
        right={
          <Button asChild>
            <Link href="/log-in-or-create-account">Anmelden</Link>
          </Button>
        }
      />
      <div>
        <Button asChild>
          <Link href="/app">Hier gehts zur APP</Link>
        </Button>
      </div>
    </>
  )
}
