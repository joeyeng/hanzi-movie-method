import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty turbopack config to silence warning when using turbopack locally
  turbopack: {},
  // Enable polling for Docker file watching (used with --webpack flag)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
