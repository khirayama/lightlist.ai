const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lightlist/sdk'],
  experimental: {
    optimizePackageImports: ['@lightlist/sdk'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // パフォーマンス最適化設定
  webpack: (config, { dev, isServer }) => {
    
    // プロダクションビルドの最適化
    if (!dev) {
      // Tree shaking の強化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Bundle splitting の最適化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // 共通ライブラリを分離
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // UI ライブラリを分離
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react-color|next-themes)[\\/]/,
            priority: 25,
          },
          // i18n 関連を分離
          i18n: {
            name: 'i18n',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
            priority: 25,
          },
          // 共通コンポーネントを分離
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
  
  // 画像最適化（静的エクスポート用に無効化）
  images: {
    unoptimized: true,
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 圧縮設定
  compress: true,
  
  // HTTP Headers の最適化
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);