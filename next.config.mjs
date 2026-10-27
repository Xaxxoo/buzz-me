/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_API_BASE,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_WS_URL,
  },
  // The old landing page is backed up at public/_landing-preview-backup.
  // The root route now serves the game directly via app/page.tsx.
};

export default nextConfig;
