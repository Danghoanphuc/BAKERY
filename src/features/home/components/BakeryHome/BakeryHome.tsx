"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
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
import { consumeProductSheetReturn } from "@/features/product/product-return";
import {
  buildProductCartItem,
  canQuickAddProduct,
  getProductStartingPrice,
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

const HOME_PROFILE_STORAGE_KEY = "bakery-home-profile-summary";
const NO_FAVORITE_IDS: string[] = [];

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

  useEffect(() => {
    const restoredProduct = consumeProductSheetReturn(products);
    if (restoredProduct) setSelectedProduct(restoredProduct);
  }, [products]);

  const categoryVisuals = useMemo(
    () => mapCategoriesToVisuals(categories),
    [categories],
  );

  const deliveryAddress = useMemo(
    () =>
      getDeliveryAddressLabel(config.deliveryAddress, profileSummary.address),
    [config.deliveryAddress, profileSummary.address],
  );

  const availableProducts = useMemo(
    () =>
      products.filter((product) =>
        config.deliveryMode === "pickup"
          ? product.availableForPickup !== false
          : product.availableForDelivery !== false,
      ),
    [config.deliveryMode, products],
  );

  const recommendationGroups = useHomeRecommendations({
    products: availableProducts,
    favoriteIds: NO_FAVORITE_IDS,
    isAuthenticated: profileSummary.isAuthenticated,
    deliveryMode: config.deliveryMode,
  });

  useEffect(() => {
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

      <div className="brand-shell relative min-h-screen pb-24 md:pb-16">
        <div className="sticky top-0 z-40 -mx-4 overflow-visible border-b border-sand bg-bg-main px-4 pb-2 pt-3 md:mx-0 md:px-0 md:pb-3 md:pt-5">
          <HomeHeader
            cartCount={totalQuantity}
            address={deliveryAddress}
            name={profileSummary.name}
            onAddressClick={() => setIsAddressModalOpen(true)}
          />
          <SearchPill
            products={availableProducts}
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
  name,
  onAddressClick,
}: {
  cartCount: number;
  address: string;
  name?: string;
  onAddressClick: () => void;
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/" className="hidden font-display text-xl font-semibold tracking-[-0.04em] text-navy md:block">
            SweetTime
          </Link>
          <span className="hidden h-6 w-px bg-sand md:block" aria-hidden="true" />
          <h1 className="min-w-0 truncate text-sm font-extrabold leading-5 text-navy">
            {name ? (
              <>
                <span className="font-semibold text-text-secondary">Chào, </span>
                <span>{name}</span>
              </>
            ) : (
              <span>Xin chào quý khách</span>
            )}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/account/preferences"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-navy transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:bg-brand-50 active:translate-y-px"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" strokeWidth={1.8} />
          </Link>

          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-brand-600 active:translate-y-px"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-1.5 text-sm font-black text-white max-sm:h-5 max-sm:min-w-5 max-sm:text-[11px]">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 md:absolute md:left-[10.5rem] md:top-11 md:mt-0">
        <button
          type="button"
          onClick={onAddressClick}
          className="flex min-h-8 min-w-0 items-center gap-1.5 whitespace-nowrap text-left text-xs font-semibold text-charcoal transition hover:text-brand-600"
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
    <div className={clsx("relative mt-2", isOpen ? "z-[80]" : "z-20")}>
      <form
        onSubmit={handleSubmit}
        className={clsx(
          "relative z-[82] flex h-11 items-center gap-2.5 overflow-hidden rounded-xl border bg-bg-card px-3.5 transition-[background-color,transform] duration-200 ease-[var(--ease-out)]",
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
            className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-text-secondary"
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
          className="fixed inset-0 z-[var(--z-raised)] cursor-default bg-navy/10"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={clsx(
          "absolute left-0 right-0 top-[3.25rem] z-[var(--z-dropdown)] max-h-[70vh] overflow-y-auto rounded-xl border border-sand bg-bg-card transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
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
              className="flex h-11 w-full items-center gap-2 rounded-xl bg-brand-50 px-3 text-left text-[13px] font-black text-navy"
            >
              <Search className="h-4 w-4 shrink-0 text-brand-700" />
              <span className="truncate">Tìm “{query.trim()}”</span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-text-muted" />
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
                  className="flex h-11 items-center rounded-xl border border-sand bg-bg-card px-3 text-left transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-400"
                >
                  <span className="block truncate whitespace-nowrap text-xs font-black text-navy">
                    {action.label}
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
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-200 ease-[var(--ease-out)] hover:bg-brand-50"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[13px] font-black text-navy">
                        {product.name}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="text-[12px] font-black text-brand-700 tabular-nums">
                          {product.sizeOptions?.length ? "Từ " : ""}{formatPrice(getProductStartingPrice(product))}
                        </span>
                        <span className="truncate text-[11px] font-bold text-text-muted">
                          {reason}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-light" />
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
                    className="min-h-11 whitespace-nowrap rounded-full border border-sand px-3 py-2 text-xs font-black text-charcoal transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-500 hover:text-brand-700"
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
      <h2 className="mb-2 text-xs font-extrabold text-text-secondary">
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
    <section className="border-b border-sand pb-3 pt-4 md:pb-5 md:pt-7">
      <h2 className="mb-3 text-sm font-extrabold text-navy">Chọn theo loại</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {categories.map((category, index) => (
          <Link
            key={`${category.name}-${index}`}
            href={category.href}
            aria-label={category.name}
            title={category.name}
            className="group grid w-[calc((100%_-_24px)/4)] min-w-[calc((100%_-_24px)/4)] shrink-0 snap-start grid-rows-[3.75rem_1.75rem] overflow-hidden rounded-xl border border-sand bg-bg-card transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-300 md:w-auto md:min-w-0 md:grid-rows-[6rem_2.25rem]"
          >
            <span className="relative block h-full w-full overflow-hidden">
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 767px) 88px, (max-width: 1023px) 25vw, 16vw"
                className="object-cover transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-[1.02]"
              />
            </span>
            <span className="block truncate border-t border-sand px-1.5 py-1.5 text-center text-[10px] font-extrabold leading-4 text-navy md:px-2 md:text-xs">
              {getCategoryDisplayName(category.name)}
            </span>
          </Link>
        ))}
        <Link
          href="/category"
          className="group flex h-[88px] w-[calc((100%_-_24px)/4)] min-w-[calc((100%_-_24px)/4)] shrink-0 snap-start flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-sand bg-bg-card transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-300 md:h-auto md:min-h-[132px] md:w-auto md:min-w-0"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50">
            <LayoutGrid className="h-4 w-4 text-brand-700" strokeWidth={2.5} />
          </div>
          <span className="whitespace-nowrap px-1 text-center text-[10px] font-extrabold leading-4 text-brand-700">
            Xem tất cả
          </span>
        </Link>
      </div>
    </section>
  );
}

function RecommendationSections({
  groups,
  onProductClick,
  onQuickAdd,
}: {
  groups: HomeRecommendationGroup[];
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
      <section className="mt-6 rounded-xl border border-sand bg-bg-card p-5 text-center">
        <h2 className="text-sm font-black">Chưa có món phù hợp</h2>
        <p className="mt-1 text-xs text-text-muted">Hãy đổi hình thức nhận hàng hoặc quay lại sau nhé.</p>
        <Link href="/search" className="mt-3 inline-flex min-h-11 items-center whitespace-nowrap rounded-xl border border-brand-500 px-4 py-2 text-xs font-black text-brand-700">Khám phá món khác</Link>
      </section>
    );
  }

  return (
    <div className="space-y-10 pb-10 pt-4 md:space-y-14 md:pb-14 md:pt-6">
      {groups.slice(0, visibleGroupCount).map((group) => (
        <section key={group.key}>
          <SectionHeader
            title={
              <span className="flex items-center gap-1.5">
                {group.title}
                {group.key === "available-now" && (
                  <Sparkles className="h-4 w-4 text-accent-gold" />
                )}
              </span>
            }
            description={group.description}
            href="/search"
            action="Xem tất cả"
          />
          <div className="mt-3 grid grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-x-3 gap-y-3 md:mt-4 md:grid-cols-[repeat(3,minmax(0,1fr))] md:gap-x-5 md:gap-y-8 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            {group.products.map((product) => (
              <ProductMiniCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                onQuickAdd={() => onQuickAdd(product)}
              />
            ))}
          </div>
        </section>
      ))}
      {visibleGroupCount < groups.length && (
        <div ref={loadMoreRef} className="flex h-20 items-center justify-center" aria-label="Đang tải thêm gợi ý">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-sand border-t-brand-500" />
        </div>
      )}
    </div>
  );
}

function ProductMiniCard({
  product,
  onClick,
  onQuickAdd,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <article className="group relative grid w-full min-w-0 grid-rows-[auto_5rem] overflow-hidden rounded-xl border border-sand bg-bg-card md:grid-rows-[auto_6.5rem]">
      <div className="relative aspect-[8/5] w-full overflow-hidden bg-cream md:aspect-square">
        <button
          type="button"
          onClick={onClick}
          className="relative h-full w-full"
          aria-label={`Xem ${product.name}`}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="object-cover transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-[1.02]"
          />
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 border-t border-sand px-2.5 py-2 md:gap-3 md:p-3">
        <button
          type="button"
          onClick={onClick}
          className="block w-full text-left"
          aria-label={`Xem ${product.name}`}
        >
          <h3 className="line-clamp-2 text-xs font-extrabold leading-4 text-navy md:min-h-10 md:text-sm md:leading-5">
            {product.name}
          </h3>
          <div className="mt-1 md:mt-2">
            <span className="block w-full whitespace-nowrap text-xs font-black leading-tight text-brand-700 tabular-nums md:text-sm">
              {product.sizeOptions?.length ? "Từ " : ""}{formatPrice(getProductStartingPrice(product)).replace(" ", "")}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onQuickAdd}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-brand-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
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
        <h2 className="brand-section-heading">{title}</h2>
        {description && (
          <p className="mt-1 hidden line-clamp-1 text-xs font-medium text-text-muted md:mt-2 md:block md:text-sm">
            {description}
          </p>
        )}
      </div>
      <Link
        href={href}
        className="flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap border-b border-brand-300 text-xs font-extrabold text-brand-700 transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-700"
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

function getCategoryDisplayName(name: string) {
  const normalized = normalizeSuggestionText(name);

  if (normalized.includes("ngan lop")) return "Ngàn lớp";
  if (normalized.includes("nguyen cam")) return "Cám";
  if (normalized.includes("trang mieng")) return "Món tiệc";
  if (normalized.includes("tra sua")) return "Trà sữa";
  if (normalized.includes("tra trai cay")) return "Trà trái";
  if (normalized.includes("sua chua")) return "Sữa chua";
  if (normalized.includes("thao moc")) return "Thảo mộc";
  if (normalized.includes("banh ngot")) return "Ngọt";

  return name.split("&")[0].trim();
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
