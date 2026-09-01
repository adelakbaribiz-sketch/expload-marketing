import type { NextConfig } from "next";

/**
 * Production Next.js configuration.
 *
 * - `output: "standalone"` produces a self-contained .next/standalone
 *   directory that can be deployed without node_modules.
 * - `reactStrictMode: false` avoids double-render in production.
 * - `poweredByHeader: false` removes the X-Powered-By header.
 * - `compress: true` enables gzip compression.
 * - Production source maps are disabled for security + bundle size.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Fail loudly on TypeScript errors during production builds.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize bundle: exclude heavy server-only packages from client bundle.
  // Note: In Next.js 16, this moved to top-level `serverExternalPackages`.
  serverExternalPackages: [
    "bcryptjs",
    "nodemailer",
    "ioredis",
    "@prisma/client",
  ],

  // Headers for static assets
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
