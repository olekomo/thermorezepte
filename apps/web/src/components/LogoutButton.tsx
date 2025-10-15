'use client'
import { Button } from './ui/button'

export default function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <Button type="submit">Logout</Button>
    </form>
  )
}
