import { Suspense } from 'react'
import LoginOrCreateAccountClient from './LoginOrCreateAccountClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginOrCreateAccountClient />
    </Suspense>
  )
}
