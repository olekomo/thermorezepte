import { NextResponse } from 'next/server'

export function POST() {
  console.log('API Route is working!')
  const res = new NextResponse('test', { status: 302 })
  return res
}
