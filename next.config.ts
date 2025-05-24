import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 
  images: {
    // domains: ['ui-avatars.com', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // === Cấu hình mới được thêm vào đây ===
      {
        protocol: 'https',
        hostname: 'icc.iuh.edu.vn',
        port: '',
        pathname: '/web/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;