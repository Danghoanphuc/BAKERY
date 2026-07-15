import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin/vouchers", destination: "/admin/marketing/vouchers", permanent: false },
      { source: "/admin/vouchers/new", destination: "/admin/marketing/vouchers/new", permanent: false },
      { source: "/admin/vouchers/scan", destination: "/admin/pos/vouchers/scan", permanent: false },
      { source: "/admin/vouchers/:id", destination: "/admin/marketing/vouchers/:id", permanent: false },
    ];
  },
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
        hostname: "res.cloudinary.com", // Cloudinary uploaded product images
      },
      {
        protocol: "https",
        hostname: "**.bing.net", // Images copied from Bing image results
      },
      {
        protocol: "https",
        hostname: "**.mm.bing.net", // Bing thumbnail CDN variants
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
