"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";

import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { useProductBuyNow } from "@/features/product/use-product-buy-now";
import { consumeProductSheetReturn } from "@/features/product/product-return";
import {
  buildProductCartItem,
  getProductStartingPrice,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { Toast } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

const FAVORITE_STORAGE_KEY = "bakery-favorite-products";

export function FavoritesClient({ products }: { products: Product[] }) {
  const { addItem } = useCartStore();
  const { toast, showToast, hideToast } = useToast();
  const buyProductNow = useProductBuyNow();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const restoredProduct = consumeProductSheetReturn(products);
    if (restoredProduct) setSelectedProduct(restoredProduct);
  }, [products]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setFavoriteIds(
        Array.isArray(parsed)
          ? parsed.filter((item) => typeof item === "string")
          : [],
      );
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  const favoriteProducts = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return products.filter((product) => favoriteSet.has(product.id));
  }, [favoriteIds, products]);

  const removeFavorite = (productId: string) => {
    setFavoriteIds((current) => {
      const next = current.filter((id) => id !== productId);
      window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showToast("Đã bỏ khỏi danh sách yêu thích", "success");
  };

  const handleAddToCart = (customization: ProductCustomization) => {
    if (!selectedProduct) return;

    addItem(buildProductCartItem(selectedProduct, customization));

    showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    setSelectedProduct(null);
  };

  return (
    <main className="brand-page">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-4 pb-32 pt-3">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm"
            aria-label="Về trang chủ"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="brand-eyebrow">
              Bộ sưu tập
            </p>
            <h1 className="brand-heading text-xl">Yêu thích</h1>
          </div>
          <Link
            href="/cart"
            className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
        </header>

        <section className="brand-card mb-5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#3d2417]">
                {favoriteProducts.length} món đang được lưu
              </p>
              <p className="mt-0.5 text-xs text-[#8c7568]">
                Mở lại nhanh những món bạn muốn đặt lần sau.
              </p>
            </div>
          </div>
        </section>

        {favoriteProducts.length > 0 ? (
          <section className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((product) => (
              <FavoriteProductCard
                key={product.id}
                product={product}
                onOpen={() => setSelectedProduct(product)}
                onRemove={() => removeFavorite(product.id)}
              />
            ))}
          </section>
        ) : (
          <EmptyFavorites />
        )}
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={(customization) =>
            buyProductNow(selectedProduct, customization)
          }
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </main>
  );
}

function FavoriteProductCard({
  product,
  onOpen,
  onRemove,
}: {
  product: Product;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="brand-card overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Xem ${product.name}`}
      >
        <div className="relative aspect-[4/5] bg-cream">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="object-cover"
          />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#b84a39] shadow-sm">
            <Sparkles className="h-3 w-3" />
            Đã lưu
          </span>
        </div>
        <div className="p-3">
          <h2 className="line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-navy">
            {product.name}
          </h2>
          <p className="mt-2 text-sm font-black text-brand-500">
            {product.sizeOptions?.length ? "Từ " : ""}{formatPrice(getProductStartingPrice(product))}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-brand-500 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
        >
          Thêm vào giỏ
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#f0dfcc] text-[#8c7568] transition hover:bg-[#fff7f2] active:scale-95"
          aria-label="Bỏ yêu thích"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function EmptyFavorites() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#e8d5c5] bg-white px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#fff0f2] text-[#b84a39]">
        <Heart className="h-8 w-8" />
      </span>
      <h2 className="mt-4 text-lg font-black text-[#3d2417]">
        Chưa có món yêu thích
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#8c7568]">
        Chạm vào biểu tượng tim trên thẻ sản phẩm để lưu lại những món muốn đặt
        sau.
      </p>
      <Link
        href="/search"
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#3d2417] px-4 text-sm font-black text-white"
      >
        <Search className="h-4 w-4" />
        Tìm món ngon
      </Link>
    </section>
  );
}
