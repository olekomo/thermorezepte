import type { NextConfig } from 'next'

const resolveSupabaseHost = (): string | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    console.warn('Invalid NEXT_PUBLIC_SUPABASE_URL provided to next.config.ts')
    return null
  }
}

const SUPABASE_HOST = resolveSupabaseHost()

const nextConfig: NextConfig = {
  images: {
    domains: SUPABASE_HOST ? [SUPABASE_HOST] : [],
    remotePatterns: SUPABASE_HOST
      ? [
          {
            protocol: 'https',
            hostname: SUPABASE_HOST,
            pathname: '/storage/v1/object/**',
          },
        ]
      : [],
  },
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
