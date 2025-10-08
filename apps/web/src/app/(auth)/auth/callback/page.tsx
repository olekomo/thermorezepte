'use client'

import { Suspense } from 'react'
import CallbackClient from './CallbackClient'

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackClient />
    </Suspense>
  )
}
