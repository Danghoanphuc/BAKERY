"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { Toast } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import {
  ProductPurchaseActions,
  ProductPurchaseContent,
} from "@/features/product/components/ProductPurchase";
import { trackProductEvent } from "@/features/product/product-analytics";
import { buildProductCartItem, getProductStartingPrice } from "@/features/product/product-cart";
import { useProductBuyNow } from "@/features/product/use-product-buy-now";
import { useProductConfigurator } from "@/features/product/use-product-configurator";
import { useToast } from "@/hooks/useToast";
import { getProductPath } from "@/lib/product-path";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { Product } from "@/types";

export function ProductPageClient({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const router = useRouter();
  const { addItem, totalQuantity } = useCartStore();
  const { config } = useOrderConfigStore();
  const buyProductNow = useProductBuyNow();
  const configurator = useProductConfigurator(product, "page");
  const { toast, showToast, hideToast } = useToast();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    trackProductEvent("product_page_view", {
      productId: product.id,
      source: "page",
    });
  }, [product.id]);

  const addToCart = () => {
    addItem(buildProductCartItem(product, configurator.customization));
    showToast(`Đã thêm ${product.name} vào giỏ hàng`, "success");
  };

  const buyNow = () => {
    trackProductEvent("checkout_started", {
      productId: product.id,
      source: "page",
      value: configurator.totalPrice,
    });
    buyProductNow(product, configurator.customization);
  };

  return (
    <div className="brand-page min-h-screen pb-36 lg:pb-12">
      <header className="sticky top-0 z-50 border-b border-sand bg-bg-main/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-black text-navy transition hover:bg-bg-soft"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Quay lại</span>
          </button>
          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalQuantity > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white">
                {totalQuantity}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-0 py-0 lg:px-6 lg:py-8">
        <article className="overflow-hidden bg-bg-card lg:rounded-3xl lg:border lg:border-sand lg:p-6 lg:shadow-[0_18px_50px_rgba(91,55,31,0.08)]">
          <ProductPurchaseContent
            product={product}
            configurator={configurator}
            deliveryMode={config.deliveryMode}
            address={config.deliveryAddress?.formattedAddress}
            onChooseAddress={() => setIsAddressModalOpen(true)}
            fullPage
          />
        </article>

        {relatedProducts.length ? (
          <section className="px-4 py-8 lg:px-0">
            <div>
              <p className="brand-eyebrow">Có thể bạn cũng thích</p>
              <h2 className="mt-1 text-2xl font-black text-navy">Món thường được xem cùng</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((related) => (
                <Link
                  key={related.id}
                  href={getProductPath(related)}
                  className="overflow-hidden rounded-2xl border border-sand bg-bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="relative block aspect-square bg-cream">
                    <ProductImage src={related.imageUrl} alt={related.name} />
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-navy">{related.name}</span>
                    <span className="mt-1 block text-sm font-black text-brand-500">Từ {formatPrice(getProductStartingPrice(related))}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-sand bg-bg-card/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(31,46,74,0.1)] backdrop-blur lg:sticky lg:bottom-0 lg:mx-auto lg:max-w-3xl lg:rounded-t-2xl lg:border-x">
        <ProductPurchaseActions
          product={product}
          configurator={configurator}
          deliveryMode={config.deliveryMode}
          source="page"
          onAddToCart={addToCart}
          onBuyNow={buyNow}
        />
      </div>

      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}
