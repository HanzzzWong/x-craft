/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  // Add webpack configuration for SQL Server modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import server-only modules in client-side code
      config.resolve.fallback = {
        // Polyfill or empty modules for Node.js specific modules
        dgram: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'node:url': false,
        'node:events': require.resolve('events/'),
        'node:buffer': require.resolve('buffer/'),
        'node:stream': require.resolve('stream-browserify'),
        'node:util': require.resolve('util/'),
        'node:crypto': require.resolve('crypto-browserify'),
        'node:path': require.resolve('path-browserify'),
        'node:os': require.resolve('os-browserify/browser'),
        'node:assert': require.resolve('assert/'),
        'node:process': require.resolve('process/browser'),
        'node:zlib': require.resolve('browserify-zlib'),
        'node:querystring': require.resolve('querystring-es3'),
        'node:http': require.resolve('stream-http'),
        'node:https': require.resolve('https-browserify'),
        'node:timers': require.resolve('timers-browserify'),
        'node:console': require.resolve('console-browserify'),
        'node:vm': require.resolve('vm-browserify'),
        'node:constants': require.resolve('constants-browserify')
      };
      
      // We'll add Buffer polyfills if needed in a simpler way later
    }
    return config;
  },
  // Other configurations
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
  },
  typescript: {
    // Set to true if you want to prevent TypeScript errors from failing the build
    ignoreBuildErrors: true,
  },
  // Log settings
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Suppress Firebase initialization logs
  env: {
    SUPPRESS_FIREBASE_LOGS: 'true'
  }
};

module.exports = nextConfig; 