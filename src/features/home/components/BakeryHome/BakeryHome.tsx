"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { Toast } from "@/components/common";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

import {
  defaultCategoryVisuals,
  type HomeCategoryVisual,
} from "../../data/homeContent";

interface BakeryHomeProps {
  categories: Category[];
  favoriteProducts: Product[];
}

export function BakeryHome({ categories, favoriteProducts }: BakeryHomeProps) {
  const { addItem, totalQuantity } = useCartStore();
  const { toast, showToast, hideToast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categoryVisuals = useMemo(
    () => mapCategoriesToVisuals(categories),
    [categories],
  );

  const handleAddToCart = (customization: {
    quantity: number;
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  }) => {
    if (!selectedProduct) return;

    let finalPrice = selectedProduct.price;
    if (customization.selectedSize && selectedProduct.sizeOptions) {
      const size = selectedProduct.sizeOptions.find(
        (item) => item.id === customization.selectedSize,
      );
      finalPrice += size?.priceAdjustment ?? 0;
    }

    addItem({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: customization.quantity,
      price: finalPrice,
      imageUrl: selectedProduct.imageUrl,
      selectedSize: customization.selectedSize,
      selectedFlavor: customization.selectedFlavor,
      customMessage: customization.customMessage,
      candles: customization.candles,
    });

    showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-bg-soft to-bg-main pointer-events-none" />

      <div className="relative mx-auto min-h-screen w-full max-w-[480px] px-4 pb-32 pt-2 sm:px-4">
        <HomeTopBar cartCount={totalQuantity} />
        <SearchPill />
        <RewardHero />
        <DeliverySwitch />
        <PromoTileGrid />
        <CategoryStrip categories={categoryVisuals} />
        <MarketingGrid />
        <FavoriteSection
          products={favoriteProducts}
          onProductClick={setSelectedProduct}
        />
        <ShippingOffer />
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

function HomeTopBar({ cartCount }: { cartCount: number }) {
  return (
    <header className="pt-2 pb-4">
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="flex min-w-0 items-center gap-1 text-text-primary"
        >
          <MapPin className="h-5 w-5 shrink-0" strokeWidth={2.5} />
          <span className="truncate text-[13px] font-medium">
            Giao đến: 45 Nguyễn Văn Cừ
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/rewards"
            className="flex items-center gap-1.5 rounded-full bg-[#fceecb] px-3 py-1.5 text-[12px] font-bold text-text-primary shadow-sm"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-accent-star text-[8px] text-white">
              $
            </span>
            <span>
              450 <span className="font-medium">điểm</span>
            </span>
          </Link>

          <Link href="/profile" aria-label="Yêu thích">
            <Heart className="h-6 w-6 text-text-primary" strokeWidth={1.5} />
          </Link>

          <Link href="/cart" className="relative" aria-label="Giỏ hàng">
            <ShoppingCart
              className="h-6 w-6 text-text-primary"
              strokeWidth={1.5}
            />
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-sm border-[1.5px] border-bg-main">
              {cartCount > 0 ? cartCount : 3}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchPill() {
  return (
    <Link
      href="/search"
      className="mb-4 flex h-[42px] items-center gap-2 rounded-full border border-[#f0e3d3] bg-white px-3 shadow-[0_2px_8px_rgba(139,75,31,0.04)]"
    >
      <Search className="h-4 w-4 text-text-light" />
      <span className="truncate text-[13px] text-text-light">
        Tìm bánh sinh nhật, croissant, trà trái cây...
      </span>
    </Link>
  );
}

function RewardHero() {
  return (
    <Link
      href="/rewards"
      className="relative block h-[150px] w-full overflow-hidden rounded-[20px] bg-[#4a2111]"
    >
      <Image
        src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=90"
        alt="Hero banner"
        fill
        className="object-cover object-right opacity-90"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#38160a] via-[#38160a]/80 to-transparent" />

      <div className="absolute inset-y-0 left-0 flex w-[65%] flex-col justify-center px-4">
        <p className="text-[15px] text-[#f7e8db] font-medium leading-tight">
          Chào{" "}
          <span className="font-serif italic text-accent-gold text-[18px]">
            Hoàn Phúc,
          </span>
        </p>
        <p className="mt-1 text-[15px] font-medium leading-tight text-[#f7e8db]">
          dùng{" "}
          <span className="text-[28px] font-black text-brand-500">
            400 điểm
          </span>
        </p>
        <p className="text-[13px] font-medium leading-tight text-[#f7e8db] mt-1">
          đổi ngay 1 Bánh sừng trâu nhé!
        </p>
        <div className="mt-3 inline-flex h-8 w-fit items-center justify-center gap-1 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-3 shadow-md">
          <span className="text-[12px] font-semibold text-white">
            Đổi thưởng ngay
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    </Link>
  );
}

function DeliverySwitch() {
  const { config, setDeliveryMode } = useOrderConfigStore();
  const mode = config.deliveryMode;

  return (
    <div className="my-4 grid grid-cols-2 rounded-[22px] bg-bg-surface p-1 shadow-inner">
      <DeliveryOption
        active={mode === "delivery"}
        icon={
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        }
        title="Giao Tận Nơi"
        subtitle="Nhận bánh tại nhà"
        onClick={() => setDeliveryMode("delivery")}
      />
      <DeliveryOption
        active={mode === "pickup"}
        icon={
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        }
        title="Đến Lấy Tại Quán"
        subtitle="Ghé tiệm lấy bánh"
        onClick={() => setDeliveryMode("pickup")}
      />
    </div>
  );
}

function DeliveryOption({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] px-1 text-left transition",
        active
          ? "bg-text-secondary text-white shadow-md"
          : "text-text-secondary",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight">
          {title}
        </span>
        <span
          className={clsx(
            "block truncate text-[10px]",
            active ? "text-[#e8d7cd]" : "text-text-muted",
          )}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function PromoTileGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/search?q=healthy"
        className="relative h-[68px] overflow-hidden rounded-[16px] bg-[#f4f7e6] p-3 shadow-sm border border-[#e5e9cc]"
      >
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[13px] font-bold text-accent-healthy leading-tight">
            Góc Bánh Healthy
          </p>
          <p className="mt-0.5 text-[10px] text-accent-healthy-light">
            Nguyên cám • Keto • Ít ngọt
          </p>
        </div>
        <Image
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80"
          alt="Healthy"
          width={80}
          height={68}
          className="absolute -bottom-1 -right-2 h-[60px] w-[70px] object-cover rounded-tl-full"
        />
      </Link>

      <Link
        href="/search?q=event"
        className="relative h-[68px] overflow-hidden rounded-[16px] bg-[#fceeed] p-3 shadow-sm border border-[#f5dbdb]"
      >
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[13px] font-bold text-accent-pink leading-tight">
            Bánh Sự Kiện
          </p>
          <p className="mt-0.5 text-[10px] text-[#d68585]">
            Sinh nhật • Kỷ niệm
          </p>
        </div>
        <Image
          src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=200&q=80"
          alt="Event"
          width={80}
          height={68}
          className="absolute -bottom-1 -right-2 h-[60px] w-[70px] object-cover rounded-tl-full"
        />
      </Link>
    </div>
  );
}

function CategoryStrip({ categories }: { categories: HomeCategoryVisual[] }) {
  return (
    <section className="pt-6">
      <SectionHeader title="Danh mục" href="/category" action="Xem tất cả" />
      <div className="grid grid-cols-5 gap-2 mt-3">
        {categories.slice(0, 5).map((category) => (
          <Link
            key={category.name}
            href={category.href}
            className="flex flex-col items-center gap-2"
          >
            <span className="relative grid aspect-square w-full max-w-[60px] place-items-center overflow-hidden rounded-full bg-[#fdf2e3] shadow-[0_2px_8px_rgba(139,75,31,0.06)]">
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="60px"
                className="object-cover p-2 rounded-full"
              />
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MarketingGrid() {
  return (
    <div className="grid grid-cols-3 gap-2.5 pt-6">
      <div className="relative h-[72px] overflow-hidden rounded-[16px] bg-bg-card p-2.5 shadow-sm border border-[#f5e3ce]">
        <p className="relative z-10 text-[12px] font-bold text-text-primary leading-tight max-w-[70%]">
          Mới Ra Lò
        </p>
        <p className="relative z-10 mt-0.5 text-[9px] text-text-muted leading-tight max-w-[60%]">
          Thơm ngon mỗi ngày
        </p>
        <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-brand-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
          MỚI
        </span>
        <Image
          src="https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=200&q=80"
          alt="Mới ra lò"
          width={80}
          height={60}
          className="absolute -bottom-2 -right-3 h-[60px] w-[60px] object-cover rounded-tl-full"
        />
      </div>

      <div className="relative h-[72px] overflow-hidden rounded-[16px] bg-[#fdf0ee] p-2.5 shadow-sm border border-[#f5dada]">
        <p className="relative z-10 text-[12px] font-bold text-[#cf6262] leading-tight max-w-[70%]">
          Best Seller
        </p>
        <p className="relative z-10 mt-0.5 text-[9px] text-[#b57a7a] leading-tight max-w-[60%]">
          Bán chạy nhất tuần
        </p>
        <Image
          src="https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=200&q=80"
          alt="Best Seller"
          width={80}
          height={60}
          className="absolute -bottom-2 -right-3 h-[60px] w-[60px] object-cover rounded-tl-full"
        />
      </div>

      <div className="relative h-[72px] overflow-hidden rounded-[16px] bg-[#fbf0dc] p-2.5 shadow-sm border border-[#f0debd]">
        <p className="relative z-10 text-[12px] font-bold text-[#b5803a] leading-tight max-w-[70%]">
          Combo Tiết Kiệm
        </p>
        <p className="relative z-10 mt-0.5 text-[9px] text-[#a38055] leading-tight max-w-[60%]">
          Ưu đãi hấp dẫn
        </p>
        <span className="absolute right-1.5 bottom-1.5 z-20 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          %
        </span>
        <Image
          src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=200&q=80"
          alt="Combo"
          width={80}
          height={60}
          className="absolute -bottom-2 -right-3 h-[60px] w-[60px] object-cover rounded-tl-full opacity-80"
        />
      </div>
    </div>
  );
}

function FavoriteSection({
  products,
  onProductClick,
}: {
  products: Product[];
  onProductClick: (product: Product) => void;
}) {
  return (
    <section className="pt-8">
      <SectionHeader
        title={
          <span className="flex items-center gap-1">
            Món Ruột Của Bạn <Sparkles className="h-4 w-4 text-[#d9a263]" />
          </span>
        }
        href="/search"
        action="Xem thêm"
      />
      <p className="-mt-1.5 mb-3 text-[11px] text-text-muted">
        Dựa trên những món bạn đã mua gần đây
      </p>

      <div className="grid grid-cols-3 gap-3">
        {products.slice(0, 3).map((product, index) => (
          <ProductMiniCard
            key={product.id}
            product={product}
            rating={(4.8 + index * 0.05).toFixed(1)}
            onClick={() => onProductClick(product)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductMiniCard({
  product,
  rating,
  onClick,
}: {
  product: Product;
  rating: string;
  onClick: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_4px_12px_rgba(139,75,31,0.06)] border border-[#f0e3d3]">
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        aria-label={`Xem ${product.name}`}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#fdf9f4]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="140px"
            className="object-cover"
          />
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#d48c8c] shadow-sm">
            <Heart className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
        <div className="p-2 pt-2.5">
          <h3 className="line-clamp-1 text-[12px] font-semibold text-text-primary">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-brand-500">
              {formatPrice(product.price).replace(" ", "")}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-text-muted">
              <Star className="h-2.5 w-2.5 fill-accent-star text-accent-star" />
              {rating}
            </span>
          </div>
        </div>
      </button>
      <div className="mt-auto px-2 pb-2 pt-1">
        <button
          type="button"
          onClick={onClick}
          className="flex h-7 w-full items-center justify-center gap-1 rounded-full bg-brand-500 text-[11px] font-bold text-white transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm vào giỏ
        </button>
      </div>
    </article>
  );
}

function ShippingOffer() {
  return (
    <Link
      href="/cart"
      className="mt-6 flex min-h-[56px] items-center gap-3 rounded-[18px] border border-[#f0dfcc] bg-[#fcf4e8] px-3 py-2 shadow-sm"
    >
      <div className="flex flex-col items-center justify-center">
        <svg
          className="w-8 h-8 text-accent-star"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span className="mt-0.5 rounded bg-accent-star px-1 text-[8px] font-bold text-white">
          FREE
        </span>
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-text-primary">
          Ưu đãi hôm nay
        </span>
        <span className="block truncate text-[13px] font-bold text-text-primary">
          Miễn phí ship cho đơn từ{" "}
          <span className="text-brand-500">149.000đ</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-text-muted" />
    </Link>
  );
}

function SectionHeader({
  title,
  action,
  href,
}: {
  title: ReactNode;
  action: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[17px] font-bold text-text-primary">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-[11px] font-medium text-text-muted"
      >
        {action}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function mapCategoriesToVisuals(categories: Category[]): HomeCategoryVisual[] {
  if (categories.length === 0) return defaultCategoryVisuals;
  return categories.slice(0, 5).map((category, index) => ({
    name: category.name,
    href: `/category/${category.id}`,
    imageUrl: isValidUrl(category.iconUrl)
      ? category.iconUrl
      : (defaultCategoryVisuals[index]?.imageUrl ??
        defaultCategoryVisuals[0].imageUrl),
  }));
}
