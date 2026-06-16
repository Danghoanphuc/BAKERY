import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Configure allowed external domains for product images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "loremflickr.com", // For demo images
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // Common product image source
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com", // E-commerce image CDN
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net", // AWS CloudFront CDN
      },
      {
        protocol: "https",
        hostname: "**.vercel.app", // Vercel hosted images
      },
    ],
    // Configure WebP format with JPEG fallback for optimal performance
    formats: ["image/webp", "image/avif"],
    // Enable image optimization for better Core Web Vitals
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
