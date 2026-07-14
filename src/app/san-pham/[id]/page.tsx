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
  return ua.includes('fban') || ua.includes('fbav') || ua.includes('zaloapp');
}

// Simple HTML fallback for in-app browsers
function InAppBrowserFallback({ product }: { product: any }) {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      <img 
        src={product.imageUrl} 
        alt={product.name}
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}
      />
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>{product.name}</h1>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
        {product.description}
      </p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff', marginBottom: '20px' }}>
        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
      </p>
      <a 
        href={`https://bakery.printz.vn/san-pham/${product.id}`}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 'bold'
        }}
      >
        Mở trong trình duyệt
      </a>
      <p style={{ fontSize: '14px', color: '#999', marginTop: '20px' }}>
        Để trải nghiệm tốt nhất, vui lòng mở trang này trong trình duyệt mặc định
      </p>
    </div>
  );
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
    return <InAppBrowserFallback product={product} />;
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
