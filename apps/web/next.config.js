/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok host access to Next.js dev resources (HMR/chunks) during development.
  allowedDevOrigins: [
    "30b5-103-235-2-167.ngrok-free.app",
    "*.ngrok-free.app",
  ],
}

module.exports = nextConfig
