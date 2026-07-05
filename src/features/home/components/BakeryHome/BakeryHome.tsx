"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import { formatPrice } from "@/lib/utils";
import { calculateVoucherPricing } from "@/lib/vouchers";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

import {
  defaultCategoryVisuals,
  type HomeCategoryVisual,
} from "../../data/homeContent";

const FAVORITE_STORAGE_KEY = "bakery-favorite-products";

interface BakeryHomeProps {
  categories: Category[];
  favoriteProducts: Product[];
}

interface HomeProfileSummary {
  name?: string;
  points: number;
  address?: string;
}

export function BakeryHome({ categories, favoriteProducts }: BakeryHomeProps) {
  const { addItem, totalQuantity } = useCartStore();
  const { config } = useOrderConfigStore();
  const { toast, showToast, hideToast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [profileSummary, setProfileSummary] = useState<HomeProfileSummary>({
    points: 0,
  });
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const categoryVisuals = useMemo(
    () => mapCategoriesToVisuals(categories),
    [categories],
  );

  const deliveryAddress = useMemo(
    () =>
      getDeliveryAddressLabel(
        config.deliveryAddress,
        profileSummary.address,
      ),
    [config.deliveryAddress, profileSummary.address],
  );

  const visibleFavoriteProducts = useMemo(
    () =>
      favoriteProducts.filter((product) =>
        config.deliveryMode === "pickup"
          ? product.availableForPickup !== false
          : product.availableForDelivery !== false,
      ),
    [config.deliveryMode, favoriteProducts],
  );

  useEffect(() => {
    try {
      const savedFavoriteIds = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (savedFavoriteIds) {
        const parsed = JSON.parse(savedFavoriteIds);
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed.filter((item) => typeof item === "string"));
        }
      }
    } catch {
      setFavoriteIds([]);
    }

    let cancelled = false;

    fetch("/api/profile")
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!data || cancelled) return;
        setProfileSummary({
          name: data.customer?.name,
          points: data.rewards?.points?.current ?? 0,
          address: data.customer?.personalization?.defaultDeliveryAddress,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfileSummary((current) => current);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((current) => {
      const isFavorite = current.includes(productId);
      const next = isFavorite
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      try {
        window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The heart state can still work in memory if local storage is blocked.
      }

      showToast(
        isFavorite ? "Đã bỏ khỏi danh sách yêu thích" : "Đã thêm vào yêu thích",
        "success",
      );

      return next;
    });
  };

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
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[300px] bg-gradient-to-b from-bg-soft to-bg-main" />

      <div className="relative mx-auto min-h-screen w-full max-w-[480px] px-4 pb-32 pt-2 sm:px-4">
        <HomeTopBar
          cartCount={totalQuantity}
          points={profileSummary.points}
          address={deliveryAddress}
          favoriteCount={favoriteIds.length}
        />
        <SearchPill />
        <DeliverySwitch
          onModeChange={(mode) =>
            showToast(
              mode === "pickup"
                ? "Đã chuyển sang đến lấy tại quán"
                : "Đã chuyển sang giao tận nơi",
              "success",
            )
          }
        />
        <PromoTileGrid />
        <CategoryStrip categories={categoryVisuals} />
        <MarketingGrid />
        <FavoriteSection
          products={visibleFavoriteProducts}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onProductClick={setSelectedProduct}
        />
        <ShippingOffer mode={config.deliveryMode} />
        <RewardHero name={profileSummary.name} points={profileSummary.points} />
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

function HomeTopBar({
  cartCount,
  points,
  address,
  favoriteCount,
}: {
  cartCount: number;
  points: number;
  address: string;
  favoriteCount: number;
}) {
  return (
    <header className="pb-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/account"
          className="flex min-w-0 flex-1 items-center gap-1 text-text-primary"
        >
          <MapPin className="h-5 w-5 shrink-0" strokeWidth={2.5} />
          <span className="truncate text-[13px] font-medium">{address}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/rewards"
            className="flex items-center gap-1.5 rounded-full bg-[#fceecb] px-3 py-1.5 text-[12px] font-bold text-text-primary shadow-sm"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-accent-star text-[8px] text-white">
              $
            </span>
            <span>
              {points.toLocaleString("vi-VN")}{" "}
              <span className="font-medium">điểm</span>
            </span>
          </Link>

          <Link href="/favorites" className="relative" aria-label="Yêu thích">
            <Heart className="h-6 w-6 text-text-primary" strokeWidth={1.5} />
            {favoriteCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-bg-main bg-[#d85d6c] text-[10px] font-bold text-white shadow-sm">
                {favoriteCount}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative" aria-label="Giỏ hàng">
            <ShoppingCart
              className="h-6 w-6 text-text-primary"
              strokeWidth={1.5}
            />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-bg-main bg-brand-500 text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
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
      className="mb-2 flex h-[42px] items-center gap-2 rounded-full border border-[#f0e3d3] bg-white px-3 shadow-[0_2px_8px_rgba(139,75,31,0.04)]"
    >
      <Search className="h-4 w-4 text-text-light" />
      <span className="truncate text-[13px] text-text-light">
        Tìm bánh sinh nhật, croissant, trà trái cây...
      </span>
    </Link>
  );
}

function RewardHero({ name, points }: { name?: string; points: number }) {
  const redeemablePoints = Math.min(Math.max(points, 0), 400);

  return (
    <Link
      href="/rewards"
      className="relative mt-6 block h-[150px] w-full overflow-hidden rounded-[20px] bg-[#4a2111]"
    >
      <Image
        src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=90"
        alt="Ưu đãi đổi điểm"
        fill
        className="object-cover object-right opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#38160a] via-[#38160a]/80 to-transparent" />

      <div className="absolute inset-y-0 left-0 flex w-[68%] flex-col justify-center px-4">
        <p className="text-[15px] font-medium leading-tight text-[#f7e8db]">
          Chào{" "}
          <span className="font-serif text-[18px] italic text-accent-gold">
            {name || "bạn"},
          </span>
        </p>
        <p className="mt-1 text-[15px] font-medium leading-tight text-[#f7e8db]">
          dùng{" "}
          <span className="text-[28px] font-black text-brand-500">
            {redeemablePoints.toLocaleString("vi-VN")} điểm
          </span>
        </p>
        <p className="mt-1 text-[13px] font-medium leading-tight text-[#f7e8db]">
          đổi ngay ưu đãi ngọt ngào hôm nay.
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

function DeliverySwitch({
  onModeChange,
}: {
  onModeChange?: (mode: "delivery" | "pickup") => void;
}) {
  const { config, setDeliveryMode } = useOrderConfigStore();
  const mode = config.deliveryMode;
  const handleModeChange = (nextMode: "delivery" | "pickup") => {
    setDeliveryMode(nextMode);
    if (nextMode !== mode) onModeChange?.(nextMode);
  };

  return (
    <div className="mb-4 grid h-9 grid-cols-2 rounded-full border border-[#efdfd1] bg-white p-1 shadow-[0_2px_8px_rgba(139,75,31,0.04)]">
      <DeliveryOption
        active={mode === "delivery"}
        title="Giao tận nơi"
        onClick={() => handleModeChange("delivery")}
      />
      <DeliveryOption
        active={mode === "pickup"}
        title="Đến lấy tại quán"
        onClick={() => handleModeChange("pickup")}
      />
    </div>
  );
}

function DeliveryOption({
  active,
  title,
  onClick,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-7 items-center justify-center rounded-full px-2 text-center text-[12px] font-bold transition",
        active
          ? "bg-[#3d2417] text-white shadow-sm"
          : "text-[#7b6254] hover:bg-[#fff7f2]",
      )}
    >
      {title}
    </button>
  );
}

function PromoTileGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/search?q=healthy"
        className="relative h-[68px] overflow-hidden rounded-[16px] border border-[#e5e9cc] bg-[#f4f7e6] p-3 shadow-sm"
      >
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[13px] font-bold leading-tight text-accent-healthy">
            Góc bánh Healthy
          </p>
          <p className="mt-0.5 text-[10px] text-accent-healthy-light">
            Nguyên cám - Keto - Ít ngọt
          </p>
        </div>
        <Image
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80"
          alt="Healthy"
          width={80}
          height={68}
          className="absolute -bottom-1 -right-2 h-[60px] w-[70px] rounded-tl-full object-cover"
        />
      </Link>

      <Link
        href="/search?q=event"
        className="relative h-[68px] overflow-hidden rounded-[16px] border border-[#f5dbdb] bg-[#fceeed] p-3 shadow-sm"
      >
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[13px] font-bold leading-tight text-accent-pink">
            Bánh sự kiện
          </p>
          <p className="mt-0.5 text-[10px] text-[#d68585]">
            Sinh nhật - Kỷ niệm
          </p>
        </div>
        <Image
          src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=200&q=80"
          alt="Event"
          width={80}
          height={68}
          className="absolute -bottom-1 -right-2 h-[60px] w-[70px] rounded-tl-full object-cover"
        />
      </Link>
    </div>
  );
}

function CategoryStrip({ categories }: { categories: HomeCategoryVisual[] }) {
  return (
    <section className="pt-6">
      <SectionHeader title="Danh mục" href="/category" action="Xem tất cả" />
      <div className="mt-3 grid grid-cols-5 gap-2">
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
                className="rounded-full object-cover p-2"
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
      <MarketingTile
        title="Mới ra lò"
        subtitle="Thơm ngon mỗi ngày"
        imageUrl="https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=200&q=80"
        imageAlt="Mới ra lò"
        badge="MỚI"
      />
      <MarketingTile
        title="Best Seller"
        subtitle="Bán chạy nhất tuần"
        imageUrl="https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=200&q=80"
        imageAlt="Best Seller"
        tone="pink"
      />
      <MarketingTile
        title="Combo tiết kiệm"
        subtitle="Ưu đãi hấp dẫn"
        imageUrl="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=200&q=80"
        imageAlt="Combo"
        tone="gold"
        badge="%"
      />
    </div>
  );
}

function MarketingTile({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  tone = "cream",
  badge,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  tone?: "cream" | "pink" | "gold";
  badge?: string;
}) {
  const toneClass = {
    cream: "border-[#f5e3ce] bg-bg-card text-text-primary",
    pink: "border-[#f5dada] bg-[#fdf0ee] text-[#cf6262]",
    gold: "border-[#f0debd] bg-[#fbf0dc] text-[#b5803a]",
  }[tone];

  return (
    <div
      className={clsx(
        "relative h-[72px] overflow-hidden rounded-[16px] border p-2.5 shadow-sm",
        toneClass,
      )}
    >
      <p className="relative z-10 max-w-[72%] text-[12px] font-bold leading-tight">
        {title}
      </p>
      <p className="relative z-10 mt-0.5 max-w-[62%] text-[9px] leading-tight text-text-muted">
        {subtitle}
      </p>
      {badge && (
        <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-brand-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
          {badge}
        </span>
      )}
      <Image
        src={imageUrl}
        alt={imageAlt}
        width={80}
        height={60}
        className="absolute -bottom-2 -right-3 h-[60px] w-[60px] rounded-tl-full object-cover"
      />
    </div>
  );
}

function FavoriteSection({
  products,
  favoriteIds,
  onToggleFavorite,
  onProductClick,
}: {
  products: Product[];
  favoriteIds: string[];
  onToggleFavorite: (productId: string) => void;
  onProductClick: (product: Product) => void;
}) {
  return (
    <section className="pt-8">
      <SectionHeader
        title={
          <span className="flex items-center gap-1">
            Món ruột của bạn <Sparkles className="h-4 w-4 text-[#d9a263]" />
          </span>
        }
        href="/favorites"
        action="Xem thêm"
      />
      <p className="-mt-1.5 mb-3 text-[11px] text-text-muted">
        Dựa trên những món bạn đã mua gần đây
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-3">
          {products.slice(0, 8).map((product, index) => (
            <ProductMiniCard
              key={product.id}
              product={product}
              rating={(4.8 + index * 0.03).toFixed(1)}
              isFavorite={favoriteIds.includes(product.id)}
              onToggleFavorite={() => onToggleFavorite(product.id)}
              onClick={() => onProductClick(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductMiniCard({
  product,
  rating,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  product: Product;
  rating: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const { selectedVoucher } = useVoucherStore();
  const voucherPricing = calculateVoucherPricing(product.price, selectedVoucher);

  return (
    <article className="flex w-[154px] shrink-0 flex-col overflow-hidden rounded-[16px] border border-[#f0e3d3] bg-white shadow-[0_4px_12px_rgba(139,75,31,0.06)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#fdf9f4]">
        <button
          type="button"
          onClick={onClick}
          className="relative h-full w-full"
          aria-label={`Xem ${product.name}`}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="object-cover"
          />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={clsx(
            "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 shadow-sm transition active:scale-95",
            isFavorite ? "text-[#d85d6c]" : "text-[#c99b9b]",
          )}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
        >
          <Heart
            className={clsx("h-3.5 w-3.5", isFavorite && "fill-current")}
            strokeWidth={2}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        aria-label={`Xem ${product.name}`}
      >
        <div className="p-2 pt-2.5">
          <h3 className="line-clamp-2 min-h-[32px] text-[12px] font-semibold leading-tight text-text-primary">
            {product.name}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-extrabold text-brand-500">
              {formatPrice(product.price).replace(" ", "")}
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-text-muted">
              <Star className="h-2.5 w-2.5 fill-accent-star text-accent-star" />
              {rating}
            </span>
          </div>
        </div>
      </button>
      <div className="px-2 pb-1">
        <Link
          href="/rewards?public=1"
          className="block rounded-md border border-dashed border-[#f0c47e] bg-[#fffaf0] px-2 py-1 text-center text-[10px] font-black text-[#7a351f]"
        >
          {selectedVoucher
            ? `${selectedVoucher.code}: còn ${formatPrice(voucherPricing.totalAfterDiscount).replace(" ", "")}`
            : "Chọn voucher"}
        </Link>
      </div>
      <div className="mt-auto px-2 pb-2 pt-1">
        <button
          type="button"
          onClick={onClick}
          className="flex h-8 w-full items-center justify-center gap-1 rounded-full bg-[#d85d6c] text-[11px] font-bold text-white shadow-sm transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </button>
      </div>
    </article>
  );
}

function ShippingOffer({ mode }: { mode: "delivery" | "pickup" }) {
  const isPickup = mode === "pickup";

  return (
    <Link
      href={isPickup ? "/checkout" : "/cart"}
      className="mt-6 flex min-h-[56px] items-center gap-3 rounded-[18px] border border-[#f0dfcc] bg-[#fcf4e8] px-3 py-2 shadow-sm"
    >
      <div className="flex flex-col items-center justify-center">
        <svg
          className="h-8 w-8 text-accent-star"
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
          {isPickup ? "Ưu đãi tự đến lấy" : "Ưu đãi hôm nay"}
        </span>
        <span className="block truncate text-[13px] font-bold text-text-primary">
          {isPickup ? (
            <>
              Không tính phí giao hàng, nhận bánh nhanh tại quán
            </>
          ) : (
            <>
              Miễn phí ship cho đơn từ{" "}
              <span className="text-brand-500">149.000đ</span>
            </>
          )}
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

function getDeliveryAddressLabel(
  address?: { street: string; district: string; city: string },
  profileAddress?: string,
) {
  if (address) return `Giao đến: ${address.street}, ${address.district}`;
  if (profileAddress) return `Giao đến: ${profileAddress}`;
  return "Chọn địa chỉ giao hàng";
}

function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch {
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
