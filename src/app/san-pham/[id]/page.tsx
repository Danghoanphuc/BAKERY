import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { BakeryHome } from "@/features/home/components";
import { loadHomeData } from "@/features/home/server/load-home-data";
import { getProductById } from "@/lib/db";
import { serializeForClient } from "@/lib/firebase/utils";
import {
  buildProductFeedItem,
  buildProductJsonLd,
  getCategoryName,
  getProductDescription,
  getProductSocialImage,
  getProductSocialTitle,
  getProductUrl,
} from "@/lib/product-publishing";

// Check if request is from in-app browser
function isInAppBrowser(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  
  // Facebook in-app browser (not crawler)
  const isFacebook = (ua.includes('fban') || ua.includes('fbav')) && !ua.includes('facebookexternalhit');
  // Zalo in-app browser (not crawler)
  const isZalo = ua.includes('zalo') && !ua.includes('zalo-crawler');
  
  return isFacebook || isZalo;
}

type ProductShareEntryProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProductShareEntryProps): Promise<Metadata> {
  const product = await getProductFromParams(params);
  if (!product) return { title: "Sản phẩm không tồn tại" };

  const title = getProductSocialTitle(product);
  const description = getProductDescription(product);
  const url = getProductUrl(product);
  const image = getProductSocialImage(product);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductShareEntry({ params }: ProductShareEntryProps) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');
  const product = await getProductFromParams(params);
  if (!product || product.isAvailable === false) notFound();

  // Check if in-app browser and show fallback
  if (isInAppBrowser(userAgent)) {
    return new Response(
      `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.name}</title>
  <meta property="og:title" content="${product.name}" />
  <meta property="og:description" content="${product.description}" />
  <meta property="og:image" content="${product.imageUrl}" />
  <meta property="og:url" content="https://bakery.printz.vn/san-pham/${product.id}" />
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f9fafb;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #1f2937;
    }
    .description {
      font-size: 16px;
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .price {
      font-size: 20px;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${product.imageUrl}" alt="${product.name}" />
    <h1>${product.name}</h1>
    <p class="description">${product.description}</p>
    <p class="price">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
  </div>
</body>
</html>`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }

  const data = await loadHomeData(product);
  const categoryName = getCategoryName(product, data.categories);
  const jsonLd = buildProductJsonLd(buildProductFeedItem(product, categoryName));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BakeryHome
        categories={serializeForClient(data.categories)}
        products={serializeForClient(data.products)}
        initialProduct={serializeForClient(product)}
        returnToHomeOnClose
      />
    </>
  );
}

async function getProductFromParams(params: Promise<{ id: string }>) {
  const { id } = await params;
  return getProductById(decodeURIComponent(id));
}
