import { NextResponse } from 'next/server'

export function POST() {
  const res = new NextResponse('test', { status: 302 })
  return res
}
