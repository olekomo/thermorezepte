// app/api/parse/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    // 1) Access-Token vom Client (z. B. fetch mit Authorization: Bearer <token>)
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'missing-auth' }, { status: 401 })
    }
    const accessToken = authHeader.slice('Bearer '.length)

    // 3) User verifizieren
    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const userId = user.id

    // 4) Body: entweder FormData (file + tmVersion) ODER JSON (image_path + tmVersion)
    const contentType = req.headers.get('content-type') ?? ''
    let imagePath: string | null = null
    let tmVersion: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      tmVersion = (form.get('thermomix_version') ?? form.get('tm_version'))?.toString() ?? null

      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'missing-file' }, { status: 400 })

      // 5) Upload in raw_uploads/<userId>/<filename>
      const filename =
        form.get('filename')?.toString() ??
        `${crypto.randomUUID()}.${file.type?.split('/')[1] ?? 'jpg'}`
      const storagePath = `${userId}/${filename}`

      const up = await supabaseAdmin.storage
        .from('raw_uploads')
        .upload(storagePath, file, { contentType: file.type || 'image/jpeg', upsert: true })

      if (up.error)
        return NextResponse.json({ error: `upload: ${up.error.message}` }, { status: 500 })

      imagePath = `raw_uploads/${storagePath}`
    } else {
      const body = await req.json().catch(() => ({}))
      imagePath = body?.image_path ?? null
      tmVersion =
        (body?.thermomix_version ?? body?.tm_version ?? body?.version ?? null) &&
        String(body.thermomix_version ?? body.tm_version ?? body.version)
    }

    if (!imagePath) return NextResponse.json({ error: 'missing-image-path' }, { status: 400 })

    // 6) Edge Function call (intern, Secret-Header)
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convert-image-to-tm`
    const apiKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
        'x-internal-secret': process.env.INTERNAL_SECRET!, // gleich wie in Function-Env
        'x-user-id': userId,
      },
      body: JSON.stringify({ image_path: imagePath, thermomix_version: tmVersion }),
    })

    const payload = await (async () => {
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        return { raw: text }
      }
    })()

    if (!res.ok) {
      return NextResponse.json({ error: 'edge-fn', detail: payload }, { status: res.status })
    }
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json(
      { error: 'unexpected', detail: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
