import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import { getCategories, getProductById } from "@/lib/db";
import {
  absoluteUrl,
  buildProductFeedItem,
  buildProductJsonLd,
  getCategoryName,
  getProductDescription,
  getProductUrl,
} from "@/lib/product-publishing";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(decodeURIComponent(id));

  if (!product) {
    return {
      title: "San pham khong ton tai",
    };
  }

  const title = product.name;
  const description = getProductDescription(product);
  const url = getProductUrl(product);
  const image = absoluteUrl(product.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "product" as "website",
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
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(decodeURIComponent(id)),
    getCategories(),
  ]);

  if (!product || product.isAvailable === false) {
    notFound();
  }

  const categoryName = getCategoryName(product, categories);
  const feedItem = buildProductFeedItem(product, categoryName);
  const jsonLd = buildProductJsonLd(feedItem);

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6 lg:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:gap-8">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-brand-600">
            {categoryName}
          </div>
          <h1 className="mt-2 text-3xl font-black leading-tight text-neutral-950">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-black text-brand-600">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 text-base leading-7 text-neutral-700">
            {feedItem.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{availabilityLabel(feedItem.availability)}</Badge>
            {feedItem.available_for_delivery && <Badge>Giao tan noi</Badge>}
            {feedItem.available_for_pickup && <Badge>Den lay</Badge>}
            {feedItem.requires_preorder && <Badge>Dat truoc</Badge>}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              <ShoppingCart className="h-4 w-4" />
              Dat hang
            </a>
            <ProductShareButton product={product} />
          </div>

          <dl className="mt-8 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-2">
            <ProductFact label="Bao quan" value={feedItem.storage} />
            <ProductFact label="Han dung" value={feedItem.shelf_life} />
            <ProductFact
              label="Di ung"
              value={feedItem.allergens.join(", ") || "Lien he cua hang"}
            />
            <ProductFact
              label="Thanh phan"
              value={feedItem.ingredients.join(", ") || "Lien he cua hang"}
            />
          </dl>
        </div>
      </div>
    </article>
  );
}

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-neutral-800">{value}</dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">
      {children}
    </span>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function availabilityLabel(availability: string) {
  if (availability === "out_of_stock") return "Het hang";
  if (availability === "preorder") return "Dat truoc";
  return "Con hang";
}
