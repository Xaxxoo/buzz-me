/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_API_BASE,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_WS_URL,
  },
  // The landing page is a static HTML page in public/landing-preview.
  // The game itself lives at /play.
  async rewrites() {
    return [
      { source: '/', destination: '/landing-preview/index.html' },
      { source: '/landing-preview', destination: '/landing-preview/index.html' },
    ];
  },
};

export default nextConfig;
