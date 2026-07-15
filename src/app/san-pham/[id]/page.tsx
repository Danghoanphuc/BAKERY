import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BakeryHome } from "@/features/home/components";
import { loadHomeData } from "@/features/home/server/load-home-data";
import { FacebookProductExperience } from "@/features/product/components/FacebookProductExperience";
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

type ProductShareEntryProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ __fb_iab?: string }>;
};

export const dynamic = "force-dynamic";

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

export default async function ProductShareEntry({
  params,
  searchParams,
}: ProductShareEntryProps) {
  const product = await getProductFromParams(params);
  if (!product || product.isAvailable === false) notFound();

  const isFacebookInApp =
    (await headers()).get("x-facebook-in-app") === "1" ||
    (await searchParams)?.__fb_iab === "1";

  if (isFacebookInApp) {
    const jsonLd = buildProductJsonLd(
      buildProductFeedItem(product, "Sản phẩm"),
    );

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <FacebookProductExperience product={serializeForClient(product)} />
      </>
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
  return getCachedProductById(decodeURIComponent(id));
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
