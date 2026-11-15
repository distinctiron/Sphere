/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables instrumentation.ts (starts the background job scheduler)
    instrumentationHook: true,
  },
}

module.exports = nextConfig
