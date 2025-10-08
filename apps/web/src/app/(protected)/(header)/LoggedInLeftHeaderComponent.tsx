'use client'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function LoggedInLeftHeaderComponent({ user }: { user: User | null }) {
  void user
  const router = useRouter()
  const pathname = usePathname()
  const [destination, setDestination] = useState('/recipes')

  useEffect(() => {
    if (pathname === '/recipes') {
      setDestination('Home')
    } else {
      setDestination('Rezepteübersicht')
    }
  }, [pathname])

  const destinationHandler = useCallback(() => {
    if (pathname === '/recipes') {
      router.push('/app')
    } else {
      router.push('/recipes')
    }
  }, [pathname, router])
  return (
    <div>
      <Button onClick={destinationHandler}>{destination}</Button>
    </div>
  )
}
