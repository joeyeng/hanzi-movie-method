import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty turbopack config to silence warning when using turbopack locally
  turbopack: {},
  // Enable polling for Docker file watching (used with --webpack flag)
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // sql.js needs special handling for client-side builds
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
