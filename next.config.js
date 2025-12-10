/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Ensure server components can access better-sqlite3
  serverExternalPackages: ['better-sqlite3'],
  
  // Optional: Configure allowed image domains if needed
  images: {
    remotePatterns: [
      // Add your image domains here if needed
      // { protocol: 'https', hostname: 'example.com' },
    ],
  },
};

module.exports = nextConfig;
