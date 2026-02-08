/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper path resolution for App Router
  experimental: {
    // This helps with path alias resolution
  },
  // Webpack configuration for Prisma compatibility
  // Note: Use --webpack flag to force webpack instead of Turbopack
  // This avoids Prisma client junction point issues on Windows
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@prisma/client'];
    }
    return config;
  },
  // Turbopack configuration for Windows compatibility
  // Empty config silences the error - Turbopack should handle Prisma on Windows better than webpack
  // If you encounter issues with Prisma on Windows using Turbopack, switch back to --webpack flag
  turbopack: {},
};

export default nextConfig;
