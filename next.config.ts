import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  rewrites() {
    return [
      // Android App Links verification for the Capacitor app (see docs/android.md).
      { source: '/.well-known/assetlinks.json', destination: '/api/assetlinks' },
    ];
  },
};

export default nextConfig;
