/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_API_BASE,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_WS_URL,
  },
  // The landing-page preview is a static page in public/landing-preview.
  async rewrites() {
    return [{ source: '/landing-preview', destination: '/landing-preview/index.html' }];
  },
};

export default nextConfig;
