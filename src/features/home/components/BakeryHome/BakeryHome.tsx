"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { CustomerPinSetupPrompt } from "@/features/auth/CustomerPinSetupPrompt";
import { useProductBuyNow } from "@/features/product/use-product-buy-now";
import {
  buildProductCartItem,
  canQuickAddProduct,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { Toast } from "@/components/common";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import { useHomeRecommendations } from "../../recommendations/use-home-recommendations";
import type { HomeRecommendationGroup } from "../../recommendations/home-recommendations";

import {
  defaultCategoryVisuals,
  type HomeCategoryVisual,
} from "../../data/homeContent";

const FAVORITE_STORAGE_KEY = "bakery-favorite-products";
const HOME_PROFILE_STORAGE_KEY = "bakery-home-profile-summary";

const homeCategoryFallbacks: HomeCategoryVisual[] = [
  ...defaultCategoryVisuals,
  {
    name: "Trà sữa",
    imageUrl:
      "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=85",
    href: "/search?q=trà sữa",
  },
];

const homeSearchIntentSuggestions = [
  {
    label: "Giao hôm nay",
    query: "giao hôm nay",
    tone: "Còn món có thể nhận sớm",
  },
  {
    label: "Sinh nhật cho bé",
    query: "bánh sinh nhật bé gái dưới 300k",
    tone: "Có mẫu dễ thương, ghi lời chúc",
  },
  {
    label: "Ít ngọt",
    query: "ít ngọt cho người lớn",
    tone: "Hợp tặng người lớn",
  },
  {
    label: "Best seller",
    query: "best seller",
    tone: "Món được chọn nhiều",
  },
];

interface BakeryHomeProps {
  categories: Category[];
  products: Product[];
  initialProduct?: Product;
  returnToHomeOnClose?: boolean;
}

interface HomeProfileSummary {
  isAuthenticated: boolean;
  hasPassword?: boolean;
  memberCode?: string;
  name?: string;
  points: number;
  address?: string;
}

export function BakeryHome({
  categories,
  products,
  initialProduct,
  returnToHomeOnClose = false,
}: BakeryHomeProps) {
  const router = useRouter();
  const { addItem, totalQuantity } = useCartStore();
  const { config } = useOrderConfigStore();
  const { toast, showToast, hideToast } = useToast();
  const buyProductNow = useProductBuyNow();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    initialProduct ?? null,
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [profileSummary, setProfileSummary] = useState<HomeProfileSummary>({
    isAuthenticated: false,
    points: 0,
  });
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const categoryVisuals = useMemo(
    () => mapCategoriesToVisuals(categories),
    [categories],
  );

  const deliveryAddress = useMemo(
    () =>
      getDeliveryAddressLabel(config.deliveryAddress, profileSummary.address),
    [config.deliveryAddress, profileSummary.address],
  );

  const visibleFavoriteProducts = useMemo(
    () =>
      products.filter((product) =>
        config.deliveryMode === "pickup"
          ? product.availableForPickup !== false
          : product.availableForDelivery !== false,
      ),
    [config.deliveryMode, products],
  );

  const recommendationGroups = useHomeRecommendations({
    products: visibleFavoriteProducts,
    favoriteIds,
    isAuthenticated: profileSummary.isAuthenticated,
    deliveryMode: config.deliveryMode,
  });

  useEffect(() => {
    try {
      const savedFavoriteIds =
        window.localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (savedFavoriteIds) {
        const parsed = JSON.parse(savedFavoriteIds);
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed.filter((item) => typeof item === "string"));
        }
      }
    } catch {
      setFavoriteIds([]);
    }

    try {
      const cachedProfile = window.sessionStorage.getItem(
        HOME_PROFILE_STORAGE_KEY,
      );
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile) as HomeProfileSummary;
        if (parsed.isAuthenticated) setProfileSummary(parsed);
      }
    } catch {
      // Continue with the fresh profile request if session storage is unavailable.
    }

    let cancelled = false;

    fetch("/api/profile")
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            window.sessionStorage.removeItem(HOME_PROFILE_STORAGE_KEY);
          }
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setProfileSummary({ isAuthenticated: false, points: 0 });
          return;
        }
        const addressBook = data.customer?.personalization?.addressBook;
        const defaultAddress = Array.isArray(addressBook)
          ? addressBook.find((address) => address?.isDefault) || addressBook[0]
          : undefined;

        const nextProfile = {
          isAuthenticated: true,
          hasPassword: Boolean(data.customer?.hasPassword),
          memberCode: data.customer?.id,
          name: data.customer?.name,
          points: data.rewards?.points?.current ?? 0,
          address:
            defaultAddress?.formattedAddress ||
            data.customer?.personalization?.defaultDeliveryAddress,
        };
        setProfileSummary(nextProfile);
        try {
          window.sessionStorage.setItem(
            HOME_PROFILE_STORAGE_KEY,
            JSON.stringify(nextProfile),
          );
        } catch {
          // The fresh state still works when session storage is blocked.
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileSummary((current) => current);
        }
      })
      .finally(() => {
        // Profile loading complete
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

  const handleAddToCart = (customization: ProductCustomization) => {
    if (!selectedProduct) return;

    addItem(buildProductCartItem(selectedProduct, customization));

    showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    closeProductSheet();
  };

  const closeProductSheet = () => {
    setSelectedProduct(null);
    if (returnToHomeOnClose) router.replace("/");
  };

  const handleQuickAdd = (product: Product) => {
    if (!canQuickAddProduct(product, config.deliveryMode)) {
      setSelectedProduct(product);
      return;
    }

    addItem(buildProductCartItem(product, { quantity: 1 }));
    showToast(`Đã thêm ${product.name} vào giỏ hàng`, "success");
  };

  return (
    <div className="brand-page">

      <div className="relative mx-auto min-h-screen w-full max-w-[480px] px-4 pb-28">
        <div className="sticky top-0 z-40 -mx-4 overflow-visible border-b border-sand/80 bg-bg-main/95 px-4 pb-3 pt-3 shadow-[0_5px_18px_rgba(18,62,102,0.06)] backdrop-blur-md">
          <HomeHeader
            cartCount={totalQuantity}
            address={deliveryAddress}
            favoriteCount={favoriteIds.length}
            name={profileSummary.name}
            onAddressClick={() => setIsAddressModalOpen(true)}
          />
          <SearchPill
            products={visibleFavoriteProducts}
            categories={categories}
          />
        </div>
        {profileSummary.isAuthenticated &&
        profileSummary.hasPassword === false ? (
          <div className="mt-3">
            <CustomerPinSetupPrompt
              isVisible
              onCompleted={() =>
                setProfileSummary((current) => ({
                  ...current,
                  hasPassword: true,
                }))
              }
            />
          </div>
        ) : null}
        <CategoryStrip categories={categoryVisuals} />
        <RecommendationSections
          groups={recommendationGroups}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onProductClick={setSelectedProduct}
          onQuickAdd={handleQuickAdd}
        />
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={closeProductSheet}
          onAddToCart={handleAddToCart}
          onBuyNow={(customization) =>
            buyProductNow(selectedProduct, customization)
          }
        />
      )}

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

function HomeHeader({
  cartCount,
  address,
  favoriteCount,
  name,
  onAddressClick,
}: {
  cartCount: number;
  address: string;
  favoriteCount: number;
  name?: string;
  onAddressClick: () => void;
}) {
  return (
    <header>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold leading-tight text-navy">
            {name ? (
              <>
                <span className="font-semibold">Chào mừng</span> {name}
              </>
            ) : (
              <span className="font-semibold">Xin chào quý khách</span>
            )}{" "}
            <span className="text-brand-500">♥</span>
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/favorites"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm transition active:scale-95"
            aria-label="Yêu thích"
          >
            <Heart className="h-7 w-7" strokeWidth={1.8} />
            {favoriteCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-black text-white">
                {favoriteCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm transition active:scale-95"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-8 w-8" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-1.5 text-sm font-black text-white max-sm:h-5 max-sm:min-w-5 max-sm:text-[11px]">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAddressClick}
          className="flex min-w-0 items-center gap-1.5 text-left text-xs font-semibold text-charcoal"
        >
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.6} />
          <span className="truncate">{address}</span>
          <ChevronDown className="h-5 w-5 shrink-0 max-sm:h-4 max-sm:w-4" />
        </button>
      </div>
    </header>
  );
}

/* Legacy member-card implementation removed from the active Home experience.
function MemberCard({
  isAuthenticated,
  memberCode,
  name,
  points,
  guestVouchers,
  areVouchersLoading,
  isProfileLoading,
}: {
  isAuthenticated: boolean;
  memberCode?: string;
  name?: string;
  points: number;
  guestVouchers: SelectableCustomerVoucher[];
  areVouchersLoading: boolean;
  isProfileLoading: boolean;
}) {
  if (isProfileLoading && !isAuthenticated) return <MemberCardSkeleton />;
  if (!isAuthenticated) {
    return (
      <GuestMemberCard
        vouchers={guestVouchers}
        isLoading={areVouchersLoading}
      />
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[15px] border border-[#efc79e] bg-[#fff3df] p-2.5 shadow-[0_4px_10px_rgba(151,76,31,0.07)]">
      <div className="absolute right-4 top-2 h-12 w-20 rounded-[22px] bg-[radial-gradient(circle_at_30%_30%,#ffc1b8,transparent_38%),linear-gradient(135deg,#ffb3a5,#fff2dd)] opacity-55" />
      <div className="relative grid grid-cols-[1.15fr_0.85fr] gap-2.5">
        <div>
          <h2 className="text-[13px] font-black text-[#542413]">
            Thành viên Ngọt & Trà <span className="text-[#d9a263]">♛</span>
          </h2>
          <p className="mt-0.5 text-[9px] font-medium leading-snug text-[#7d513d]">
            Đưa mã cho nhân viên để tích điểm hoặc sử dụng điểm thưởng
          </p>
          <div className="mt-1.5 rounded-[11px] bg-white px-3 py-1.5 shadow-[0_4px_10px_rgba(116,57,21,0.07)]">
            <MemberBarcode value={memberCode || name || "MEMBER"} />
            <p className="mt-1 text-center text-[11px] font-black tracking-wide text-[#1e120d]">
              {formatMemberCode(memberCode || name || "MEMBER")}
            </p>
          </div>
        </div>
        <div className="relative flex flex-col justify-end gap-1 pt-5">
          <div className="absolute right-2 top-0 text-[26px] leading-none">
            🎁
          </div>
          <MemberStat
            icon={<Star className="h-3.5 w-3.5 fill-current" />}
            label={`${points.toLocaleString("vi-VN")} điểm`}
            detail="Lịch sử"
            href="/rewards"
          />
          <MemberStat
            icon={<Gift className="h-3.5 w-3.5" />}
            label="0 quà"
            detail={name ? "Quà của bạn" : "Khám phá"}
            href="/rewards"
          />
        </div>
      </div>
    </section>
  );
}

function MemberCardSkeleton() {
  return (
    <section
      className="h-[142px] animate-pulse overflow-hidden rounded-[18px] border border-[#efdfcf] bg-[#fff3df] p-3"
      aria-label="Đang tải thông tin thành viên"
    >
      <div className="h-4 w-40 rounded-full bg-white/80" />
      <div className="mt-3 h-9 w-full rounded-[12px] bg-white/75" />
      <div className="mt-2 h-12 w-full rounded-[12px] bg-white/65" />
    </section>
  );
}

function GuestMemberCard({
  vouchers,
  isLoading,
}: {
  vouchers: SelectableCustomerVoucher[];
  isLoading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#efc79e] bg-[#fff3df] p-3 shadow-[0_4px_10px_rgba(151,76,31,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-black text-[#542413]">
            Thành viên Ngọt & Trà
          </h2>
          <p className="mt-1 text-[10px] font-medium text-[#7d513d]">
            Đăng nhập để tích điểm, nhận quà và lưu ưu đãi.
          </p>
        </div>
        <span className="text-2xl" aria-hidden="true">🎁</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Link
          href="/account/login"
          className="flex h-9 flex-1 items-center justify-center rounded-full bg-[#c35847] text-[11px] font-black text-white"
        >
          Đăng nhập
        </Link>
        <Link
          href="/account/register"
          className="flex h-9 flex-1 items-center justify-center rounded-full border border-[#c35847] bg-white text-[11px] font-black text-[#9e3e2f]"
        >
          Đăng ký
        </Link>
      </div>
      <div className="-mx-3 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading && (
          <div className="h-16 w-full shrink-0 animate-pulse rounded-[12px] bg-white/70" />
        )}
        {!isLoading && vouchers.length === 0 && (
          <div className="w-full shrink-0 rounded-[12px] bg-white/80 p-3 text-center text-[11px] font-bold text-[#8b614c]">
            Ưu đãi mới sẽ sớm xuất hiện tại đây.
          </div>
        )}
        {vouchers.map((voucher) => (
          <Link
            key={voucher.id}
            href="/account/register"
            className="w-[82%] shrink-0 snap-start rounded-[12px] border border-[#f1d6bc] bg-white p-3 shadow-sm"
          >
            <span className="block text-[12px] font-black text-[#9e3e2f]">{voucher.title}</span>
            <span className="mt-1 block line-clamp-2 text-[10px] font-medium text-[#7d513d]">{voucher.description}</span>
            <span className="mt-1.5 block text-[10px] font-black tracking-wide text-[#542413]">Mã: {voucher.code}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "*": "nwnnwnwnn",
};

function MemberBarcode({ value }: { value: string }) {
  const encoded = `*${
    value
      .toUpperCase()
      .replace(/[^A-Z0-9. -]/g, "")
      .slice(0, 24) || "MEMBER"
  }*`;
  const bars: { x: number; width: number }[] = [];
  let x = 8;
  for (const character of encoded) {
    [...(CODE39[character] || CODE39["-"])].forEach((unit, index) => {
      const width = unit === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 1;
  }
  return (
    <svg
      viewBox={`0 0 ${x + 8} 34`}
      className="h-8 w-full"
      role="img"
      aria-label={`Mã thành viên ${value}`}
      preserveAspectRatio="none"
    >
      <rect width="100%" height="34" fill="white" />
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y="1"
          width={bar.width}
          height="32"
          fill="#111"
        />
      ))}
    </svg>
  );
}

function formatMemberCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function MemberStat({
  icon,
  label,
  detail,
  href,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-[34px] items-center gap-1.5 rounded-[10px] border border-[#f2d8bf] bg-white/80 px-2 shadow-sm"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f2b333] text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-black text-[#7a3a23]">
          {label}
        </span>
        <span className="mt-0.5 flex items-center gap-0.5 text-[8px] font-medium text-[#9b715b]">
          {detail}
          <ChevronRight className="h-3 w-3" />
        </span>
      </span>
    </Link>
  );
}

*/
function SearchPill({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const assist = useMemo(
    () => buildSearchAssist(products, categories, query),
    [categories, products, query],
  );

  const openSearch = () => {
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    setIsOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearchSoon = () => {
    blurTimerRef.current = window.setTimeout(() => setIsOpen(false), 120);
  };

  const goToSearch = (value: string) => {
    const nextQuery = value.trim();
    const target = nextQuery
      ? `/search?q=${encodeURIComponent(nextQuery)}`
      : "/search";
    router.push(target);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToSearch(query);
  };

  useEffect(
    () => () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    },
    [],
  );

  return (
    <div className={clsx("relative mt-3", isOpen ? "z-[80]" : "z-20")}>
      <form
        onSubmit={handleSubmit}
        className={clsx(
          "relative z-[82] flex h-12 items-center gap-2.5 overflow-hidden rounded-xl border bg-bg-card px-3.5 shadow-sm transition-all duration-200",
          isOpen
            ? "border-teal ring-2 ring-teal/15"
            : "border-sand",
        )}
      >
        <Search
          className="h-[18px] w-[18px] shrink-0 text-teal"
          strokeWidth={1.8}
        />
        <input
          ref={inputRef}
          value={query}
          onBlur={closeSearchSoon}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={openSearch}
          placeholder="Tìm bánh sinh nhật, croissant, trà trái cây, trà sữa, bánh ngọt..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-charcoal outline-none placeholder:text-text-light"
          aria-label="Tìm bánh"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              openSearch();
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#f7eee7] text-[#7b6254] max-sm:h-7 max-sm:w-7"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {isOpen && (
        <button
          type="button"
          aria-label="Đóng gợi ý tìm kiếm"
          className="fixed inset-0 z-[70] cursor-default bg-[#3d2417]/10 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={clsx(
          "absolute left-0 right-0 top-[58px] z-[81] max-h-[70vh] overflow-y-auto rounded-2xl border border-sand bg-bg-card/95 shadow-[0_18px_38px_rgba(18,62,102,0.15)] backdrop-blur-lg transition-all duration-200",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="space-y-4 p-3">
          {query.trim() && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => goToSearch(query)}
              className="flex h-11 w-full items-center gap-2 rounded-[14px] bg-[#fff4ec] px-3 text-left text-[13px] font-black text-[#3d2417]"
            >
              <Search className="h-4 w-4 shrink-0 text-[#b84a39]" />
              <span className="truncate">Tìm “{query.trim()}”</span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#9b8171]" />
            </button>
          )}

          <AssistSection title="Tìm nhanh theo nhu cầu">
            <div className="grid grid-cols-2 gap-2">
              {assist.actions.map((action) => (
                <button
                  key={action.query}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goToSearch(action.query)}
                  className="min-h-[72px] rounded-[14px] border border-[#f0e3d3] bg-[#fffaf6] p-3 text-left transition hover:border-[#b84a39]"
                >
                  <span className="block text-[13px] font-black leading-tight text-[#3d2417]">
                    {action.label}
                  </span>
                  <span className="mt-1 block text-[11px] font-bold leading-snug text-[#9b8171]">
                    {action.tone}
                  </span>
                </button>
              ))}
            </div>
          </AssistSection>

          {assist.products.length > 0 && (
            <AssistSection
              title={query.trim() ? "Món khớp gần nhất" : "Đáng mua lúc này"}
            >
              <div className="space-y-2">
                {assist.products.map(({ product, reason }) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSearch(product.name)}
                    className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left transition hover:bg-[#fff4ec]"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-[#fdf2e3]">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[13px] font-black text-[#3d2417]">
                        {product.name}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="text-[12px] font-black text-[#b84a39]">
                          {formatPrice(product.price)}
                        </span>
                        <span className="truncate text-[11px] font-bold text-[#9b8171]">
                          {reason}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#b7a397]" />
                  </button>
                ))}
              </div>
            </AssistSection>
          )}

          {assist.categories.length > 0 && (
            <AssistSection title="Duyệt theo danh mục">
              <div className="flex flex-wrap gap-2">
                {assist.categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSearch(category)}
                    className="rounded-full border border-[#eadbcc] px-3 py-2 text-xs font-black text-[#65483a] transition hover:border-[#b84a39] hover:text-[#b84a39]"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </AssistSection>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.04em] text-[#b38a76]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function buildSearchAssist(
  products: Product[],
  categories: Category[],
  query: string,
) {
  const normalizedQuery = normalizeSuggestionText(query);
  const visibleCategories = categories
    .filter((category) => category.isVisible ?? true)
    .map((category) => category.name);
  const matchedProducts = products
    .map((product) => ({
      product,
      score: getAssistProductScore(product, normalizedQuery),
      reason: getAssistProductReason(product),
    }))
    .filter((item) => !normalizedQuery || item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const matchedActions = homeSearchIntentSuggestions.filter(
    (action) =>
      !normalizedQuery ||
      normalizeSuggestionText(
        `${action.label} ${action.query} ${action.tone}`,
      ).includes(normalizedQuery),
  );

  return {
    actions:
      matchedActions.length > 0
        ? matchedActions
        : homeSearchIntentSuggestions.slice(0, 2),
    products: matchedProducts,
    categories: visibleCategories
      .filter(
        (category) =>
          !normalizedQuery ||
          normalizeSuggestionText(category).includes(normalizedQuery),
      )
      .slice(0, 6),
  };
}

function getAssistProductScore(product: Product, normalizedQuery: string) {
  const haystack = normalizeSuggestionText(
    [
      product.name,
      product.description,
      ...(product.searchKeywords ?? []),
      ...(product.occasionTags ?? []),
      ...(product.dietaryTags ?? []),
      ...(product.tags ?? []),
    ].join(" "),
  );

  const relevance =
    normalizedQuery && haystack.includes(normalizedQuery) ? 20 : 0;
  return (
    relevance +
    Number(product.isBestseller) * 8 +
    Number(product.isFeatured) * 6 +
    Number(product.availableToday !== false) * 4 +
    Number(product.isNew) * 3 +
    (product.sortPriority ?? 0)
  );
}
function getAssistProductReason(product: Product) {
  if (product.availableToday !== false && !product.requiresPreorder)
    return "Có hôm nay";
  if (product.isBestseller) return "Best seller";
  if (product.requiresMessage) return "Ghi lời chúc";
  if (product.isNew) return "Mới ra lò";
  return "Phù hợp để xem nhanh";
}

function normalizeSuggestionText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function CategoryStrip({ categories }: { categories: HomeCategoryVisual[] }) {
  return (
    <section className="pt-4">
      <p className="brand-eyebrow mb-3">
        Danh mục sản phẩm
      </p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category, index) => (
          <Link
            key={`${category.name}-${index}`}
            href={category.href}
            className="group w-[calc((100%_-_24px)/4)] min-w-[calc((100%_-_24px)/4)] shrink-0 snap-start overflow-hidden rounded-xl border border-sand bg-bg-card shadow-sm transition active:scale-[0.97]"
          >
            <span className="flex h-11 items-start overflow-hidden px-2 pt-2 text-[11px] font-extrabold leading-[13px] text-navy">
              {category.name}
            </span>
            <span className="relative block h-16 w-full overflow-hidden">
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="84px"
                className="object-cover transition duration-200 group-hover:scale-105"
              />
            </span>
          </Link>
        ))}
        <Link
          href="/category"
          className="group flex h-[108px] w-[calc((100%_-_24px)/4)] min-w-[calc((100%_-_24px)/4)] shrink-0 snap-start flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-sand bg-bg-card shadow-sm transition active:scale-[0.97]"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f0d8c2]/40">
            <LayoutGrid className="h-4 w-4 text-[#8a6855]" strokeWidth={2.5} />
          </div>
          <span className="px-1 text-center text-[10px] font-black leading-[11px] text-[#8a6855]">
            Xem tất cả
          </span>
        </Link>
      </div>
    </section>
  );
}

export function FeaturedPromo() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-[22px] bg-[#ffe2df] p-6 shadow-[0_8px_22px_rgba(209,89,92,0.1)] max-sm:mt-5 max-sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#fff8f0_0_18%,transparent_19%),linear-gradient(135deg,#ffe9e5,#ffd2d3)]" />
      <div className="relative z-10 grid min-h-[176px] grid-cols-[1fr_1fr] items-center gap-5 max-sm:grid-cols-1">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff3e8] px-3 py-1.5 text-[13px] font-black text-[#9b3f24] max-sm:text-xs">
            🔥 Ưu đãi nổi bật
          </span>
          <h2 className="mt-4 max-w-[340px] font-serif text-[38px] font-black italic leading-[0.95] text-[#8b2e25] max-sm:text-3xl">
            Set Trà & Bánh Ngọt Ngào ♡
          </h2>
          <p className="mt-3 text-[14px] font-medium text-[#9b715b] max-sm:text-sm">
            Thưởng vị ngọt lành - ưu đãi dành riêng bạn
          </p>
          <Link
            href="/search?q=combo trà bánh"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#c35847] px-5 text-[14px] font-black text-white shadow-sm max-sm:h-10 max-sm:text-sm"
          >
            Khám phá ngay
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative min-h-[176px] max-sm:hidden">
          <Image
            src="https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=520&q=90"
            alt="Set trà bánh"
            fill
            className="rounded-[28px] object-cover"
          />
          <div className="absolute left-4 top-4 grid h-28 w-28 place-items-center rounded-full bg-white/90 text-center shadow-sm">
            <span className="text-[15px] font-bold text-[#b84a39]">
              Giảm đến
              <span className="block text-[40px] font-black leading-none">
                25%
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-4 flex justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#c35847]" />
        <span className="h-2 w-2 rounded-full bg-[#e8d9ce]" />
        <span className="h-2 w-2 rounded-full bg-[#e8d9ce]" />
        <span className="h-2 w-2 rounded-full bg-[#e8d9ce]" />
      </div>
    </section>
  );
}

function RecommendationSections({
  groups,
  favoriteIds,
  onToggleFavorite,
  onProductClick,
  onQuickAdd,
}: {
  groups: HomeRecommendationGroup[];
  favoriteIds: string[];
  onToggleFavorite: (productId: string) => void;
  onProductClick: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}) {
  const [visibleGroupCount, setVisibleGroupCount] = useState(2);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleGroupCount(Math.min(2, groups.length));
  }, [groups]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleGroupCount >= groups.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleGroupCount((count) => Math.min(count + 1, groups.length));
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [groups.length, visibleGroupCount]);

  if (!groups.length) {
    return (
      <section className="mt-6 rounded-[18px] border border-[#efdfcf] bg-white p-5 text-center">
        <h2 className="text-sm font-black">Chưa có món phù hợp</h2>
        <p className="mt-1 text-xs text-[#8a6250]">Hãy đổi hình thức nhận hàng hoặc quay lại sau nhé.</p>
        <Link href="/search" className="mt-3 inline-flex rounded-full bg-[#c35847] px-4 py-2 text-xs font-black text-white">Khám phá tất cả món</Link>
      </section>
    );
  }

  return (
    <div className="space-y-7 pt-6">
      {groups.slice(0, visibleGroupCount).map((group) => (
        <section key={group.key}>
          <SectionHeader
            title={
              <span className="flex items-center gap-1.5">
                {group.title}
                {group.key === "available-now" && (
                  <Sparkles className="h-4 w-4 text-[#d9a263]" />
                )}
              </span>
            }
            description={group.description}
            href="/search"
            action="Xem tất cả"
          />
          <div className="mt-3 grid grid-cols-2 items-start gap-3">
            {group.products.map((product) => (
              <ProductMiniCard
                key={product.id}
                product={product}
                reason={group.productReason}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={() => onToggleFavorite(product.id)}
                onClick={() => onProductClick(product)}
                onQuickAdd={() => onQuickAdd(product)}
              />
            ))}
          </div>
        </section>
      ))}
      {visibleGroupCount < groups.length && (
        <div ref={loadMoreRef} className="flex h-20 items-center justify-center" aria-label="Đang tải thêm gợi ý">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#ead7c8] border-t-[#c35847]" />
        </div>
      )}
    </div>
  );
}

function ProductMiniCard({
  product,
  reason,
  isFavorite,
  onToggleFavorite,
  onClick,
  onQuickAdd,
}: {
  product: Product;
  reason?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <article className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-sand bg-bg-card shadow-[0_7px_20px_rgba(18,62,102,0.07)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
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
            "absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl bg-bg-card/95 text-beige shadow-sm transition active:scale-95",
            isFavorite ? "text-brand-500" : "text-text-light",
          )}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
        >
          <Heart
            className={clsx("h-4 w-4", isFavorite && "fill-current")}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="relative min-h-[112px] p-3">
        <button
          type="button"
          onClick={onClick}
          className="block w-full text-left"
          aria-label={`Xem ${product.name}`}
        >
          <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-navy">
            {product.name}
          </h3>
          {reason && (
            <span className="mt-1 block truncate text-xs font-semibold text-text-muted">
              {reason}
            </span>
          )}
          <div className="mt-2 pr-9">
            <span className="block w-full whitespace-nowrap text-sm font-black leading-tight text-brand-500">
              {formatPrice(product.price).replace(" ", "")}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onQuickAdd}
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-sm transition active:scale-95"
          aria-label={`Thêm nhanh ${product.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function SectionHeader({
  title,
  description,
  action,
  href,
}: {
  title: ReactNode;
  description?: string;
  action: string;
  href: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-navy">{title}</h2>
        {description && (
          <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
            {description}
          </p>
        )}
      </div>
      <Link
        href={href}
        className="flex min-h-8 items-center gap-0.5 text-xs font-bold text-brand-500"
      >
        {action}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function getDeliveryAddressLabel(
  address?: {
    street: string;
    district: string;
    city: string;
    formattedAddress?: string;
  },
  profileAddress?: string,
) {
  if (address?.formattedAddress) return `Giao đến: ${address.formattedAddress}`;
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
  if (categories.length === 0) return homeCategoryFallbacks;
  const mapped = categories.map((category, index) => ({
    name: category.name,
    href: `/category/${category.id}`,
    imageUrl: isValidUrl(category.iconUrl)
      ? category.iconUrl
      : (homeCategoryFallbacks[index]?.imageUrl ??
        homeCategoryFallbacks[0].imageUrl),
  }));
  return mapped;
}
