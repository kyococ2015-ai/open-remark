import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path((?!embed\\.js$).*)',
        destination: 'https://open-remark.zeon.studio/:path',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/embed.js',
        destination: 'https://open-remark.zeon.studio/embed.js',
      },
    ];
  },
};

module.exports = nextConfig;