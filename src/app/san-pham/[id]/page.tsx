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

// Trigger new build

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

  const data = await loadHomeData(product);
  const categoryName = getCategoryName(product, data.categories);
  const jsonLd = buildProductJsonLd(buildProductFeedItem(product, categoryName));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {isInAppBrowser(userAgent) ? (
        <div style={{ 
          padding: '16px', 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f3f4f6',
          minHeight: '100vh'
        }}>
          {/* Header */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ 
              fontSize: '20px', 
              margin: '0 0 8px 0', 
              color: '#111827',
              fontWeight: '600'
            }}>{product.name}</h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: '0',
              lineHeight: '1.5'
            }}>{product.description}</p>
          </div>

          {/* Product Image */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            marginBottom: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <img 
              src={product.imageUrl} 
              alt={product.name}
              style={{ 
                width: '100%', 
                height: 'auto', 
                display: 'block'
              }}
            />
          </div>

          {/* Price Card */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Giá bán</span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#dc2626'
              }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
              </span>
            </div>
          </div>

          {/* Info Cards */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Trạng thái</span>
              <div style={{ 
                display: 'inline-block', 
                padding: '4px 12px', 
                backgroundColor: '#dcfce7', 
                color: '#166534', 
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '500',
                marginLeft: '8px'
              }}>
                Còn hàng
              </div>
            </div>
            {product.preparationTimeMinutes && (
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Thời gian chuẩn bị</span>
                <span style={{ fontSize: '14px', color: '#374151', marginLeft: '8px' }}>
                  {product.preparationTimeMinutes} phút
                </span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <a 
            href={`https://bakery.printz.vn/san-pham/${product.id}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
            }}
          >
            Đặt hàng ngay
          </a>
        </div>
      ) : (
        <BakeryHome
          categories={serializeForClient(data.categories)}
          products={serializeForClient(data.products)}
          initialProduct={serializeForClient(product)}
          returnToHomeOnClose
        />
      )}
    </>
  );
}

async function getProductFromParams(params: Promise<{ id: string }>) {
  const { id } = await params;
  return getProductById(decodeURIComponent(id));
}
