/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lightlist/sdk'],
  experimental: {
    outputFileTracingIncludes: {
      '/': ['../../packages/sdk/dist/**/*'],
    },
  },
};

module.exports = nextConfig;