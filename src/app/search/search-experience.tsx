"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Heart,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { Toast } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { formatPrice } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

const FAVORITE_STORAGE_KEY = "bakery-favorite-products";
const SEARCH_HISTORY_KEY = "bakery-search-history";

type SortMode = "relevance" | "price-asc" | "price-desc" | "popular";

interface FilterChip {
  id: string;
  label: string;
  match: (product: Product, context: ProductContext) => boolean;
}

interface ProductContext {
  categoryName: string;
  haystack: string;
}

const filterChips: FilterChip[] = [
  {
    id: "delivery",
    label: "Giao hôm nay",
    match: (product) => product.availableForDelivery !== false,
  },
  {
    id: "birthday",
    label: "Bánh sinh nhật",
    match: (_, context) => hasAny(context.haystack, ["sinh nhật", "birthday"]),
  },
  {
    id: "healthy",
    label: "Ít ngọt / healthy",
    match: (_, context) =>
      hasAny(context.haystack, ["healthy", "keto", "ít ngọt", "nguyên cám"]),
  },
  {
    id: "under-100",
    label: "Dưới 100k",
    match: (product) => product.price <= 100000,
  },
  {
    id: "bestseller",
    label: "Best seller",
    match: (product) => Boolean(product.isBestseller),
  },
  {
    id: "message",
    label: "Có ghi lời chúc",
    match: (product) => Boolean(product.requiresMessage),
  },
  {
    id: "new",
    label: "Mới ra lò",
    match: (product) => Boolean(product.isNew),
  },
];

const quickSuggestions = [
  "bánh sinh nhật bé gái",
  "ít ngọt",
  "giao hôm nay",
  "croissant",
  "chocolate",
  "dưới 100k",
];

export function SearchExperience({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const { addItem, totalQuantity } = useCartStore();
  const { config } = useOrderConfigStore();
  const { toast, showToast, hideToast } = useToast();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  useEffect(() => {
    setFavoriteIds(readStringArray(FAVORITE_STORAGE_KEY));
    setHistory(readStringArray(SEARCH_HISTORY_KEY).slice(0, 6));
  }, []);

  const inferredFilters = useMemo(() => inferFilters(query), [query]);
  const combinedFilters = useMemo(
    () => Array.from(new Set([...activeFilters, ...inferredFilters])),
    [activeFilters, inferredFilters],
  );

  const results = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const tokens = normalizedQuery.split(" ").filter(Boolean);

    const scored = products
      .filter((product) =>
        config.deliveryMode === "pickup"
          ? product.availableForPickup !== false
          : product.availableForDelivery !== false,
      )
      .map((product) => {
        const context = getProductContext(product, categoryById);
        const textScore = getTextScore(product, context, tokens);
        const filterScore = combinedFilters.every((filterId) => {
          const filter = filterChips.find((item) => item.id === filterId);
          return filter ? filter.match(product, context) : true;
        });

        if (!filterScore) return null;
        if (tokens.length > 0 && textScore === 0) return null;

        const boost =
          Number(product.isBestseller) * 8 +
          Number(product.isFeatured) * 6 +
          Number(product.isNew) * 4 +
          Number(product.availableToday !== false) * 3 +
          (product.sortPriority ?? 0);

        return {
          product,
          score: textScore + boost,
          context,
        };
      })
      .filter(Boolean) as Array<{
      product: Product;
      score: number;
      context: ProductContext;
    }>;

    return scored.sort((left, right) => {
      if (sortMode === "price-asc") return left.product.price - right.product.price;
      if (sortMode === "price-desc") return right.product.price - left.product.price;
      if (sortMode === "popular") {
        return (
          Number(right.product.isBestseller) - Number(left.product.isBestseller) ||
          right.score - left.score
        );
      }
      return right.score - left.score;
    });
  }, [categoryById, combinedFilters, config.deliveryMode, products, query, sortMode]);

  const recommendedProducts = useMemo(
    () =>
      products
        .filter((product) =>
          config.deliveryMode === "pickup"
            ? product.availableForPickup !== false
            : product.availableForDelivery !== false,
        )
        .filter((product) => product.isBestseller || product.isFeatured)
        .slice(0, 6),
    [config.deliveryMode, products],
  );

  const toggleFilter = (filterId: string) => {
    setActiveFilters((current) =>
      current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId],
    );
  };

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((current) => {
      const isFavorite = current.includes(productId);
      const next = isFavorite
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
      showToast(isFavorite ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", "success");
      return next;
    });
  };

  const applyQuery = (value: string) => {
    setQuery(value);
    if (!value.trim()) return;

    setHistory((current) => {
      const next = [value.trim(), ...current.filter((item) => item !== value.trim())].slice(0, 6);
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
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

  const showDiscovery = query.trim().length === 0 && combinedFilters.length === 0;

  return (
    <main className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-4 pb-32 pt-3">
        <header className="sticky top-0 z-20 -mx-4 bg-bg-main/95 px-4 pb-3 pt-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#efdfd1] bg-white text-[#3d2417] shadow-sm"
              aria-label="Về trang chủ"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#d85d6c]">
                Tìm nhanh
              </p>
              <h1 className="text-xl font-black text-[#3d2417]">Chọn bánh</h1>
            </div>
            <Link
              href="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-[#efdfd1] bg-white text-[#3d2417] shadow-sm"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#d85d6c] text-[10px] font-black text-white">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>

          <div className="flex h-11 items-center gap-2 rounded-full border border-[#efdfd1] bg-white px-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-[#9b8171]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyQuery(query);
              }}
              placeholder="Tìm theo dịp, vị bánh, giá, giao hàng..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#3d2417] outline-none placeholder:text-[#b7a397]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-7 w-7 place-items-center rounded-full bg-[#f7eee7] text-[#7b6254]"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {filterChips.map((chip) => {
                const active = combinedFilters.includes(chip.id);
                const inferred = inferredFilters.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleFilter(chip.id)}
                    className={clsx(
                      "h-8 rounded-full border px-3 text-xs font-bold transition",
                      active
                        ? "border-[#d85d6c] bg-[#d85d6c] text-white"
                        : "border-[#eadbcc] bg-white text-[#7b6254]",
                    )}
                  >
                    {chip.label}
                    {inferred && " *"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-[14px] border border-[#efdfd1] bg-white px-3 py-2 text-xs font-bold text-[#7b6254]">
            {config.deliveryMode === "pickup"
              ? "Đang hiển thị các món có thể nhận tại quán."
              : "Đang hiển thị các món có thể giao tận nơi."}
          </div>
        </header>

        {showDiscovery ? (
          <Discovery
            history={history}
            recommendedProducts={recommendedProducts}
            mode={config.deliveryMode}
            onPickQuery={applyQuery}
            onOpenProduct={setSelectedProduct}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <section className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[#3d2417]">
                {results.length} kết quả phù hợp
              </p>
              <SortControl value={sortMode} onChange={setSortMode} />
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {results.map(({ product, context }) => (
                  <SearchProductCard
                    key={product.id}
                    product={product}
                    categoryName={context.categoryName}
                    mode={config.deliveryMode}
                    isFavorite={favoriteIds.includes(product.id)}
                    onToggleFavorite={() => toggleFavorite(product.id)}
                    onOpen={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <NoResults onReset={() => {
                setQuery("");
                setActiveFilters([]);
              }} />
            )}
          </section>
        )}
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
    </main>
  );
}

function Discovery({
  history,
  recommendedProducts,
  mode,
  favoriteIds,
  onPickQuery,
  onOpenProduct,
  onToggleFavorite,
}: {
  history: string[];
  recommendedProducts: Product[];
  mode: "delivery" | "pickup";
  favoriteIds: string[];
  onPickQuery: (query: string) => void;
  onOpenProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
}) {
  return (
    <div className="space-y-6 pt-2">
      <section>
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Gợi ý nhanh" />
        <div className="mt-3 flex flex-wrap gap-2">
          {quickSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPickQuery(item)}
              className="rounded-full border border-[#eadbcc] bg-white px-3 py-2 text-xs font-bold text-[#65483a] shadow-sm"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <SectionTitle icon={<Clock3 className="h-4 w-4" />} title="Tìm gần đây" />
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPickQuery(item)}
                className="flex h-10 w-full items-center justify-between rounded-[14px] border border-[#f0e3d3] bg-white px-3 text-left text-sm font-bold text-[#3d2417]"
              >
                {item}
                <Search className="h-4 w-4 text-[#9b8171]" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={<Heart className="h-4 w-4" />} title="Đang được chọn nhiều" />
        <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3">
            {recommendedProducts.map((product) => (
              <SearchProductCard
                key={product.id}
                product={product}
                isCompact
                mode={mode}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={() => onToggleFavorite(product.id)}
                onOpen={() => onOpenProduct(product)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SearchProductCard({
  product,
  categoryName,
  isCompact = false,
  mode,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  product: Product;
  categoryName?: string;
  isCompact?: boolean;
  mode: "delivery" | "pickup";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      className={clsx(
        "overflow-hidden rounded-[16px] border border-[#f0e3d3] bg-white shadow-[0_4px_12px_rgba(139,75,31,0.06)]",
        isCompact && "w-[154px] shrink-0",
      )}
    >
      <div className="relative aspect-[4/5] bg-[#fdf9f4]">
        <button
          type="button"
          onClick={onOpen}
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
            "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm transition active:scale-95",
            isFavorite ? "text-[#d85d6c]" : "text-[#c99b9b]",
          )}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
        >
          <Heart className={clsx("h-4 w-4", isFavorite && "fill-current")} />
        </button>
        {product.isBestseller && (
          <span className="absolute left-2 top-2 rounded-full bg-[#3d2417] px-2 py-1 text-[10px] font-black text-white">
            Best seller
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#65483a] shadow-sm">
          {mode === "pickup" ? "Nhận tại quán" : "Giao tận nơi"}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="block w-full p-3 text-left">
        {categoryName && (
          <p className="mb-1 truncate text-[10px] font-bold uppercase text-[#b38a76]">
            {categoryName}
          </p>
        )}
        <h2 className="line-clamp-2 min-h-[36px] text-[13px] font-bold leading-tight text-[#3d2417]">
          {product.name}
        </h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-[14px] font-black text-[#d85d6c]">
            {formatPrice(product.price)}
          </p>
          <span className="rounded-full bg-[#fff4ec] px-2 py-1 text-[10px] font-bold text-[#8c5a42]">
            Thêm
          </span>
        </div>
      </button>
    </article>
  );
}

function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (value: SortMode) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-1 rounded-full border border-[#eadbcc] bg-white px-2 text-xs font-bold text-[#65483a]">
      <SlidersHorizontal className="h-3.5 w-3.5" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortMode)}
        className="bg-transparent outline-none"
      >
        <option value="relevance">Phù hợp</option>
        <option value="popular">Bán chạy</option>
        <option value="price-asc">Giá thấp</option>
        <option value="price-desc">Giá cao</option>
      </select>
    </label>
  );
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <section className="mt-8 rounded-[22px] border border-dashed border-[#e8d5c5] bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff4ec] text-[#d85d6c]">
        <Search className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-black text-[#3d2417]">
        Chưa tìm thấy món phù hợp
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#8c7568]">
        Thử bỏ bớt bộ lọc hoặc tìm theo dịp như sinh nhật, vị chocolate, ít
        ngọt.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 h-10 rounded-full bg-[#3d2417] px-4 text-sm font-black text-white"
      >
        Xem lại gợi ý
      </button>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#fff0f2] text-[#d85d6c]">
        {icon}
      </span>
      <h2 className="text-base font-black text-[#3d2417]">{title}</h2>
    </div>
  );
}

function getProductContext(
  product: Product,
  categoryById: Map<string, string>,
): ProductContext {
  const categoryName = product.categoryId
    ? (categoryById.get(product.categoryId) ?? "")
    : "";
  const flavors = product.flavorOptions?.map((item) => item.label).join(" ") ?? "";
  const sizes = product.sizeOptions?.map((item) => item.label).join(" ") ?? "";
  const metadata = [
    ...(product.tags ?? []),
    ...(product.occasionTags ?? []),
    ...(product.dietaryTags ?? []),
    ...(product.allergens ?? []),
    ...(product.searchKeywords ?? []),
  ].join(" ");
  const flags = [
    product.isBestseller ? "best seller bán chạy" : "",
    product.isNew ? "mới ra lò" : "",
    product.isFeatured ? "nổi bật" : "",
    product.requiresMessage ? "lời chúc sinh nhật" : "",
  ].join(" ");
  const haystack = normalizeText(
    `${product.name} ${product.description ?? ""} ${categoryName} ${flavors} ${sizes} ${metadata} ${flags}`,
  );

  return { categoryName, haystack };
}

function getTextScore(
  product: Product,
  context: ProductContext,
  tokens: string[],
) {
  if (tokens.length === 0) return 1;

  let score = 0;
  const name = normalizeText(product.name);
  for (const token of tokens) {
    if (name.includes(token)) score += 12;
    else if (context.categoryName && normalizeText(context.categoryName).includes(token)) score += 8;
    else if (context.haystack.includes(token)) score += 4;
  }
  return score;
}

function inferFilters(query: string) {
  const normalized = normalizeText(query);
  const filters: string[] = [];
  if (hasAny(normalized, ["giao", "ship", "hôm nay", "ngay"])) filters.push("delivery");
  if (hasAny(normalized, ["sinh nhật", "birthday", "bé trai", "bé gái"])) filters.push("birthday");
  if (hasAny(normalized, ["ít ngọt", "healthy", "keto", "nguyên cám"])) filters.push("healthy");
  if (hasAny(normalized, ["best", "bán chạy", "ngon nhất"])) filters.push("bestseller");
  if (hasAny(normalized, ["lời chúc", "ghi chữ", "viết chữ"])) filters.push("message");

  const priceMatch = normalized.match(/(?:duoi|dưới|<)\s*(\d{2,4})\s*k?/);
  if (priceMatch && Number(priceMatch[1]) <= 100) filters.push("under-100");

  return filters;
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(normalizeText(needle)));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readStringArray(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
