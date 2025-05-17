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
    ],
  },
};

export default nextConfig;
