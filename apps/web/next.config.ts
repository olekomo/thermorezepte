const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_HOST = SUPABASE_URL
  ? new URL(SUPABASE_URL).hostname
  : 'nwesnadltllgbwvjylqp.supabase.co'

const nextConfig = {
  images: {
    domains: [SUPABASE_HOST],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: SUPABASE_HOST,
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
}
export default nextConfig
