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

  const clickHandler = useCallback(() => {
    if (pathname === '/recipes') {
      router.push('/app')
    } else {
      router.push('/recipes')
    }
  }, [pathname])
  return (
    <div>
      <Button onClick={clickHandler}>{destination}</Button>
    </div>
  )
}
