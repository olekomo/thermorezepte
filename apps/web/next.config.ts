import type { NextConfig } from 'next'

const resolveSupabaseHost = (): string | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    console.warn('⚠️ Invalid NEXT_PUBLIC_SUPABASE_URL provided to next.config.ts')
    return null
  }
}

const SUPABASE_HOST = resolveSupabaseHost()

const nextConfig = {
  images: {
    remotePatterns: [
      ...(SUPABASE_HOST
        ? [
            {
              protocol: 'https' as const,
              hostname: SUPABASE_HOST,
              pathname: '/storage/v1/object/**' as const,
            },
          ]
        : []),
      {
        protocol: 'https' as const,
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
} satisfies NextConfig

export default nextConfig
