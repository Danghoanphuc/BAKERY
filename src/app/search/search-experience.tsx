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

interface SearchQueryAnalysis {
  filters: string[];
  intents: string[];
  maxPrice?: number;
}

interface SearchIntentRule {
  filterId: string;
  label: string;
  needles: string[];
  tokenPattern: RegExp;
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
    match: (product) => getProductStartingPrice(product) <= 100000,
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

const filterById = new Map(filterChips.map((filter) => [filter.id, filter]));

const intentRules: SearchIntentRule[] = [
  {
    filterId: "delivery",
    label: "Cần nhận sớm",
    needles: ["giao", "ship", "hom nay", "ngay", "chieu nay"],
    tokenPattern: /\b(?:giao|ship|hom nay|ngay|chieu nay)\b/g,
  },
  {
    filterId: "birthday",
    label: "Theo dịp",
    needles: ["sinh nhat", "birthday", "be trai", "be gai", "su kien", "event"],
    tokenPattern: /\b(?:sinh nhat|birthday|be trai|be gai|su kien|event)\b/g,
  },
  {
    filterId: "healthy",
    label: "Ít ngọt / healthy",
    needles: ["it ngot", "healthy", "keto", "nguyen cam", "nguoi lon"],
    tokenPattern: /\b(?:it ngot|healthy|keto|nguyen cam|nguoi lon)\b/g,
  },
  {
    filterId: "bestseller",
    label: "Được chọn nhiều",
    needles: ["best", "ban chay", "ngon nhat", "pho bien"],
    tokenPattern: /\b(?:best|ban chay|ngon nhat|pho bien)\b/g,
  },
  {
    filterId: "message",
    label: "Có lời chúc",
    needles: ["loi chuc", "ghi chu", "viet chu", "tang"],
    tokenPattern: /\b(?:loi chuc|ghi chu|viet chu|tang)\b/g,
  },
];

const maxPricePattern =
  /(?:duoi|toi da|tam|khoang|<)\s*(\d{2,4})\s*(k|nghin|ngan|000)?/;

interface SearchResult {
  product: Product;
  score: number;
  context: ProductContext;
  reasons: string[];
}

const quickSuggestions = [
  "bánh sinh nhật bé gái dưới 300k",
  "ít ngọt cho người lớn",
  "giao hôm nay có ghi lời chúc",
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
  const buyProductNow = useProductBuyNow();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const restoredProduct = consumeProductSheetReturn(products);
    if (restoredProduct) setSelectedProduct(restoredProduct);
  }, [products]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  useEffect(() => {
    setFavoriteIds(readStringArray(FAVORITE_STORAGE_KEY));
    setHistory(readStringArray(SEARCH_HISTORY_KEY).slice(0, 6));
  }, []);

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initialQuery) applyQuery(initialQuery);
    // The landing query should hydrate the page once when users arrive from home.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queryAnalysis = useMemo(() => analyzeSearchQuery(query), [query]);
  const inferredFilters = queryAnalysis.filters;
  const combinedFilters = useMemo(
    () => Array.from(new Set([...activeFilters, ...inferredFilters])),
    [activeFilters, inferredFilters],
  );

  const results = useMemo(() => {
    const tokens = getSearchTokens(query);

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
          const filter = filterById.get(filterId);
          return filter ? filter.match(product, context) : true;
        });

        if (!filterScore) return null;
        if (queryAnalysis.maxPrice && getProductStartingPrice(product) > queryAnalysis.maxPrice) return null;
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
          reasons: getProductReasons(product, context, queryAnalysis, config.deliveryMode),
        };
      })
      .filter(Boolean) as SearchResult[];

    return scored.sort((left, right) => {
      if (sortMode === "price-asc") return getProductStartingPrice(left.product) - getProductStartingPrice(right.product);
      if (sortMode === "price-desc") return getProductStartingPrice(right.product) - getProductStartingPrice(left.product);
      if (sortMode === "popular") {
        return (
          Number(right.product.isBestseller) - Number(left.product.isBestseller) ||
          right.score - left.score
        );
      }
      return right.score - left.score;
    });
  }, [categoryById, combinedFilters, config.deliveryMode, products, query, queryAnalysis, sortMode]);

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

  const handleAddToCart = (customization: ProductCustomization) => {
    if (!selectedProduct) return;

    addItem(buildProductCartItem(selectedProduct, customization));

    showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    setSelectedProduct(null);
  };

  const showDiscovery = query.trim().length === 0 && combinedFilters.length === 0;

  return (
    <main className="brand-page">
      <div className="brand-shell min-h-screen pb-24 pt-3 md:pb-16">
        <header className="sticky top-0 z-20 -mx-4 border-b border-sand bg-bg-main px-4 pb-3 pt-3 md:mx-0 md:px-0 md:pb-4 md:pt-5">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-navy"
              aria-label="Về trang chủ"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="brand-heading text-xl">Chọn bánh</h1>
            <Link
              href="/cart"
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-navy"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-cream">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>

          <div className="mx-auto flex h-11 max-w-3xl items-center gap-2 rounded-xl border border-sand bg-bg-card px-3 focus-within:outline focus-within:outline-2 focus-within:outline-brand-500">
            <Search className="h-4 w-4 shrink-0 text-teal" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyQuery(query);
              }}
              placeholder="VD: sinh nhật bé gái, ít ngọt, giao chiều nay"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-charcoal outline-none placeholder:text-text-light"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-text-secondary"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max max-w-full gap-2 md:justify-center">
              {filterChips.map((chip) => {
                const active = combinedFilters.includes(chip.id);
                const inferred = inferredFilters.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleFilter(chip.id)}
                    className={clsx(
                      "h-11 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors duration-200 ease-[var(--ease-out)]",
                      active
                        ? "border-brand-500 bg-brand-500 text-cream"
                        : "border-sand bg-bg-card text-charcoal",
                    )}
                  >
                    {chip.label}
                    {inferred && " *"}
                  </button>
                );
              })}
            </div>
          </div>

          {queryAnalysis.intents.length > 0 && (
            <IntentSummary intents={queryAnalysis.intents} />
          )}

          <div className="mt-3 rounded-xl border border-teal/25 bg-teal-soft px-3 py-2 text-xs font-bold text-teal">
            {config.deliveryMode === "pickup"
              ? "Đang hiển thị các món có thể nhận tại quán."
              : "Đang hiển thị các món có thể giao tận nơi."}
          </div>
        </header>

        {showDiscovery ? (
          <Discovery
            history={history}
            recommendedProducts={recommendedProducts}
            onPickQuery={applyQuery}
            onOpenProduct={setSelectedProduct}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <section className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-navy">
                {results.length} kết quả phù hợp
              </p>
              <SortControl value={sortMode} onChange={setSortMode} />
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))] md:gap-5 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
                {results.map(({ product, context, reasons }) => (
                  <SearchProductCard
                    key={product.id}
                    product={product}
                    categoryName={context.categoryName}
                    reasons={reasons}
                    isFavorite={favoriteIds.includes(product.id)}
                    onToggleFavorite={() => toggleFavorite(product.id)}
                    onOpen={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <NoResults
                onPickQuery={applyQuery}
                onReset={() => {
                  setQuery("");
                  setActiveFilters([]);
                }}
              />
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

function Discovery({
  history,
  recommendedProducts,
  favoriteIds,
  onPickQuery,
  onOpenProduct,
  onToggleFavorite,
}: {
  history: string[];
  recommendedProducts: Product[];
  favoriteIds: string[];
  onPickQuery: (query: string) => void;
  onOpenProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
}) {
  return (
    <div className="space-y-10 py-6 md:py-10">
      <section>
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Gợi ý nhanh" />
        <div className="mt-3 flex flex-wrap gap-2">
          {quickSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPickQuery(item)}
              className="min-h-11 rounded-full border border-sand bg-bg-card px-3 py-2 text-xs font-bold text-charcoal"
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
                className="flex h-11 w-full items-center justify-between rounded-xl border border-sand bg-bg-card px-3 text-left text-sm font-bold text-navy"
              >
                {item}
                <Search className="h-4 w-4 text-text-muted" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={<Heart className="h-4 w-4" />} title="Đang được chọn nhiều" />
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3 md:grid md:w-full md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {recommendedProducts.map((product) => (
              <SearchProductCard
                key={product.id}
                product={product}
                isCompact
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
  reasons = [],
  isCompact = false,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  product: Product;
  categoryName?: string;
  reasons?: string[];
  isCompact?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      className={clsx(
        "group overflow-hidden rounded-xl border border-sand bg-bg-card",
        isCompact && "w-[154px] shrink-0 md:w-auto md:min-w-0",
      )}
    >
      <div className="relative aspect-[4/3] bg-bg-soft md:aspect-square">
        <button
          type="button"
          onClick={onOpen}
          className="relative h-full w-full"
          aria-label={`Xem ${product.name}`}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="object-cover transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-[1.02]"
          />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={clsx(
            "absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-text-light transition-[color,transform] duration-200 ease-[var(--ease-out)] active:translate-y-px",
            isFavorite && "text-brand-600",
          )}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
        >
          <Heart className={clsx("h-4 w-4", isFavorite && "fill-current")} />
        </button>
        {product.isBestseller && (
          <span className="absolute left-2 top-2 rounded-lg bg-navy px-2 py-1 text-[10px] font-black text-cream">
            Best seller
          </span>
        )}
      </div>
      <button type="button" onClick={onOpen} className="block w-full p-3 text-left">
        {categoryName && (
          <p className="mb-1 truncate text-[10px] font-bold text-text-muted">
            {categoryName}
          </p>
        )}
        <h2 className="line-clamp-2 min-h-9 text-[13px] font-bold leading-tight text-navy">
          {product.name}
        </h2>
        {reasons.length > 0 && (
          <div className="mt-2 flex min-h-[22px] flex-wrap gap-1">
            {reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-lg bg-brand-50 px-2 py-1 text-[10px] font-bold text-text-secondary"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-[14px] font-black text-brand-700 tabular-nums">
            {product.sizeOptions?.length ? "Từ " : ""}{formatPrice(getProductStartingPrice(product))}
          </p>
          <span className="whitespace-nowrap border-b border-brand-300 text-[10px] font-bold text-brand-700">
            Xem
          </span>
        </div>
      </button>
    </article>
  );
}

function IntentSummary({ intents }: { intents: string[] }) {
  return (
    <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2">
        <span className="text-[11px] font-black text-text-muted">
          Đã hiểu
        </span>
        {intents.map((intent) => (
          <span
            key={intent}
            className="rounded-full border border-sand bg-bg-card px-3 py-1.5 text-xs font-bold text-charcoal"
          >
            {intent}
          </span>
        ))}
      </div>
    </div>
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
    <label className="flex h-11 items-center gap-1 rounded-xl border border-sand bg-bg-card px-2 text-xs font-bold text-charcoal">
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

function NoResults({
  onPickQuery,
  onReset,
}: {
  onPickQuery: (query: string) => void;
  onReset: () => void;
}) {
  const recoveryQueries = ["giao hôm nay", "best seller", "bánh sinh nhật", "ít ngọt"];

  return (
    <section className="mt-8 border-y border-sand bg-bg-card px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Search className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-black text-navy">
        Chưa tìm thấy món phù hợp
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Mình chưa ghép được đủ điều kiện. Bạn có thể nới ngân sách, bỏ bớt bộ
        lọc hoặc chuyển sang nhóm gần nhất.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {recoveryQueries.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPickQuery(item)}
            className="min-h-11 rounded-full border border-sand bg-bg-card px-3 py-2 text-xs font-black text-charcoal"
          >
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 h-11 whitespace-nowrap rounded-xl border border-navy px-4 text-sm font-black text-navy"
      >
        Xem lại gợi ý
      </button>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center text-brand-700">
        {icon}
      </span>
      <h2 className="text-base font-black text-navy">{title}</h2>
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

function getSearchTokens(query: string) {
  const normalized = intentRules
    .reduce(
      (value, rule) => value.replace(rule.tokenPattern, " "),
      normalizeText(query).replace(new RegExp(maxPricePattern.source, "g"), " "),
    )
    .replace(/\s+/g, " ")
    .trim();

  return normalized.split(" ").filter((token) => token.length > 1);
}

function analyzeSearchQuery(query: string): SearchQueryAnalysis {
  const normalized = normalizeText(query);
  const filters: string[] = [];
  const intents: string[] = [];

  intentRules.forEach((rule) => {
    addIntentWhen(hasAny(normalized, rule.needles), {
      filterId: rule.filterId,
      label: rule.label,
      filters,
      intents,
    });
  });

  const maxPrice = getMaxPriceFromQuery(normalized);
  if (maxPrice) {
    intents.push(`Dưới ${formatPrice(maxPrice)}`);
    if (maxPrice <= 100000) filters.push("under-100");
  }

  return {
    filters: Array.from(new Set(filters)),
    intents: Array.from(new Set(intents)).slice(0, 5),
    maxPrice,
  };
}

function addIntentWhen(
  condition: boolean,
  options: {
    filterId: string;
    label: string;
    filters: string[];
    intents: string[];
  },
) {
  if (!condition) return;
  options.filters.push(options.filterId);
  options.intents.push(options.label);
}

function getMaxPriceFromQuery(normalizedQuery: string) {
  const match = normalizedQuery.match(maxPricePattern);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return amount < 10000 ? amount * 1000 : amount;
}

function getProductReasons(
  product: Product,
  context: ProductContext,
  analysis: SearchQueryAnalysis,
  mode: "delivery" | "pickup",
) {
  const reasons: string[] = [];
  const addReason = (condition: boolean, reason: string) => {
    if (condition && !reasons.includes(reason)) reasons.push(reason);
  };

  addReason(mode === "pickup", "Nhận tại quán");
  addReason(mode === "delivery" && product.availableForDelivery !== false, "Giao được");
  addReason(product.availableToday !== false && !product.requiresPreorder, "Có hôm nay");
  addReason(product.requiresMessage === true, "Ghi lời chúc");
  addReason(product.isBestseller === true, "Best seller");
  addReason(product.isNew === true, "Mới");
  addReason(analysis.maxPrice !== undefined && getProductStartingPrice(product) <= analysis.maxPrice, "Đúng ngân sách");
  addReason(
    hasAny(context.haystack, ["healthy", "keto", "it ngot", "nguyen cam"]),
    "Ít ngọt",
  );

  return reasons.slice(0, 3);
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
