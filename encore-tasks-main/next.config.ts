import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Разрешаем все хосты для работы в Replit
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ],
      },
    ]
  },
  // Настройки для dev сервера (Replit proxy compatibility)
  async rewrites() {
    return []
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'pg-native': false,
      };
      // Исключаем pg модули из клиентской сборки
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-pool': 'commonjs pg-pool',
        'pg-connection-string': 'commonjs pg-connection-string',
        'pgpass': 'commonjs pgpass',
      });
    }
    return config;
  },
  serverExternalPackages: ['pg', 'pg-pool', 'pg-connection-string', 'pgpass'],
  // Настройки для работы в Replit
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;