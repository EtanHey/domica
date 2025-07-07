import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'py5iwgffjd.ufs.sh',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.facebook.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.fbcdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.yad2.co.il',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yad2-images.yit.co.il',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.yad2.co.il',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.yad2.treedis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.yad2.co.il',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
