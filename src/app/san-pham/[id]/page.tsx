import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { loadHomeData } from "@/features/home/server/load-home-data";
import { ProductPageClient } from "@/features/product/components/ProductPage";
import { getProductById } from "@/lib/db";
import { serializeForClient } from "@/lib/firebase/utils";
import { getProductIdFromPathSegment } from "@/lib/product-path";
import {
  buildProductFeedItem,
  buildProductJsonLd,
  getCategoryName,
  getProductDescription,
  getProductSocialImage,
  getProductSocialTitle,
  getProductUrl,
} from "@/lib/product-publishing";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
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

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductFromParams(params);
  if (!product || product.isAvailable === false) notFound();

  const data = await loadHomeData(product);
  const categoryName = getCategoryName(product, data.categories);
  const jsonLd = buildProductJsonLd(buildProductFeedItem(product, categoryName));
  const relatedProducts = data.products.filter(
    (item) => item.id !== product.id && item.categoryId === product.categoryId,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageClient
        product={serializeForClient(product)}
        relatedProducts={serializeForClient(relatedProducts)}
      />
    </>
  );
}

async function getProductFromParams(params: Promise<{ id: string }>) {
  const { id } = await params;
  return getCachedProductById(getProductIdFromPathSegment(id));
}

const getCachedProductById = cache(async (id: string) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getProductById(id);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
      }
    }
  }

  throw lastError;
});
