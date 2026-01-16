/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper path resolution for App Router
  experimental: {
    // This helps with path alias resolution
  },
  // Webpack configuration for Prisma compatibility
  // Note: We're using --webpack flag to force webpack instead of Turbopack
  // This avoids Prisma client junction point issues on Windows
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@prisma/client'];
    }
    return config;
  },
};

export default nextConfig;
