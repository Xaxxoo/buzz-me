/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_API_BASE,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_WS_URL,
  },
};

export default nextConfig;
