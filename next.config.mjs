/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["localhost", "nuxgxpsofrcaumfvhqbh.supabase.co"],
  },
  // Necessário para builds standalone do Docker
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
