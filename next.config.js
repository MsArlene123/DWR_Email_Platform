const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  // Force bcryptjs into the standalone build's node_modules.
  // Next.js's output file tracing sometimes misses bcryptjs because it's
  // only imported indirectly (lib/auth.ts → app/api/auth/[...nextauth]).
  // Without this, the production authorize() function throws
  // "Cannot find module 'bcryptjs'" and every login silently fails.
  experimental: {
    outputFileTracingIncludes: {
      '/api/auth/[...nextauth]': ['./node_modules/bcryptjs/**/*'],
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
      config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
    }
    return config;
  },
};

module.exports = nextConfig;
