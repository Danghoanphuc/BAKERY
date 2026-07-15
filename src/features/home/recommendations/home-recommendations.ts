import type { Product } from "@/types/product";

export type HomeRecommendationKey =
  | "available-now"
  | "personalized"
  | "repurchase"
  | "popular"
  | "occasion"
  | "discovery";

export interface PurchaseHistoryItem { productId: string; quantity: number }
export interface PurchaseHistoryOrder { status?: string; items?: PurchaseHistoryItem[] }
export interface HomeRecommendationGroup {
  key: HomeRecommendationKey;
  title: string;
  description: string;
  products: Product[];
  productReason: string;
}

interface Options {
  products: Product[];
  orders?: PurchaseHistoryOrder[];
  favoriteIds?: string[];
  hour?: number;
  limitPerGroup?: number;
  deliveryMode?: "delivery" | "pickup";
}

const slots = [
  { from: 5, to: 11, title: "Bữa sáng nhận sớm", words: ["croissant", "bánh mì", "cà phê", "coffee"] },
  { from: 11, to: 17, title: "Ngọt ngào buổi chiều", words: ["trà", "tea", "cookie", "tart", "su kem"] },
  { from: 17, to: 24, title: "Chia sẻ cùng nhau", words: ["combo", "sinh nhật", "cake", "bánh kem", "tiệc"] },
] as const;

export function buildHomeRecommendations({
  products, orders = [], favoriteIds = [], hour = new Date().getHours(),
  limitPerGroup = 6, deliveryMode = "delivery",
}: Options): HomeRecommendationGroup[] {
  const now = new Date();
  const available = products.filter((p) => isEligible(p, deliveryMode, now));
  const favoriteSet = new Set(favoriteIds);
  const purchases = purchaseCounts(orders);
  const affinity = buildAffinity(available, purchases, favoriteSet);
  const used = new Set<string>();
  const result: HomeRecommendationGroup[] = [];
  const slot = slots.find((s) => hour >= s.from && hour < s.to) ?? slots[2];
  const repurchaseCandidates = rank(
    available.filter((p) => purchases.has(p.id)),
    (p) => (purchases.get(p.id) ?? 0) * 50 + fulfillment(p),
  ).slice(0, limitPerGroup);
  const reservedForRepurchase = new Set(repurchaseCandidates.map((p) => p.id));

  const hasPersonalSignals = purchases.size > 0 || favoriteSet.size > 0;
  add(result, used, "personalized", "Dành riêng cho bạn",
    hasPersonalSignals
      ? "Dựa trên món đã mua và sở thích của bạn"
      : "Những lựa chọn nổi bật phù hợp để bắt đầu",
    hasPersonalSignals ? "Phù hợp khẩu vị của bạn" : "Gợi ý nổi bật cho bạn",
    rank(
      available.filter((p) => !reservedForRepurchase.has(p.id)),
      (p) => hasPersonalSignals ? personalScore(p, affinity, favoriteSet) : popularity(p),
    ), limitPerGroup);

  add(result, used, "available-now", slot.title,
    "Còn hàng và phù hợp khung giờ nhận hiện tại", "Có thể chuẩn bị sớm",
    rank(available.filter((p) => !reservedForRepurchase.has(p.id)), (p) => fulfillment(p) + keyword(p, slot.words) * 100 + base(p)), limitPerGroup);

  add(result, used, "repurchase", "Mua lại nhanh",
    "Những món bạn từng mua và vẫn đang sẵn sàng phục vụ", "Bạn từng mua món này",
    repurchaseCandidates, limitPerGroup);

  add(result, used, "popular", "Đang được yêu thích",
    "Xếp hạng theo sức mua và tỷ lệ chuyển đổi gần đây", "Nhiều khách đang lựa chọn",
    rank(available, popularity), limitPerGroup);

  add(result, used, "occasion", "Cho dịp đặc biệt",
    "Sinh nhật, quà tặng và những buổi gặp gỡ đáng nhớ", "Hợp cho một dịp đáng nhớ",
    rank(available.filter((p) => (p.occasionTags?.length ?? 0) > 0 || keyword(p, ["sinh nhật", "tiệc", "quà", "combo"])),
      (p) => keyword(p, ["sinh nhật", "tiệc", "quà", "combo"]) * 15 + base(p)), limitPerGroup);

  add(result, used, "discovery", "Khám phá món mới",
    "Thêm một chút mới mẻ vào lựa chọn quen thuộc", "Một lựa chọn mới để khám phá",
    rank(available, (p) => (p.isNew ? 50 : 0) + recency(p) + base(p) * .25), limitPerGroup);
  return result;
}

function add(groups: HomeRecommendationGroup[], used: Set<string>, key: HomeRecommendationKey,
  title: string, description: string, productReason: string, ranked: Product[], limit: number) {
  const products = ranked.filter((p) => !used.has(p.id)).slice(0, limit);
  if (!products.length) return;
  products.forEach((p) => used.add(p.id));
  groups.push({ key, title, description, productReason, products });
}

function isEligible(p: Product, mode: "delivery" | "pickup", now: Date) {
  if (p.isAvailable === false || (p.stock ?? p.dailyStock ?? 1) <= 0) return false;
  if (mode === "pickup" ? p.availableForPickup === false : p.availableForDelivery === false) return false;
  if (p.availableToday === false) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (!p.availableFrom || minutes >= clock(p.availableFrom)) && (!p.availableUntil || minutes <= clock(p.availableUntil));
}

function rank(products: Product[], score: (p: Product) => number) {
  return [...products].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
}
function fulfillment(p: Product) { return Math.max(0, 45 - (p.preparationTimeMinutes ?? 30)) + (p.availableToday !== false ? 20 : 0) + Math.min(p.stock ?? p.dailyStock ?? 1, 20); }
function popularity(p: Product) { const m = p.feedMetrics; return (m?.sales7d ?? 0) * 3 + (m?.sales30d ?? 0) + (m?.conversionRate ?? 0) * 100 + (m?.addToCartRate ?? 0) * 35 + (m?.popularityScore ?? 0) + base(p); }
function base(p: Product) { return (p.isBestseller ? 40 : 0) + (p.isFeatured ? 20 : 0) + (p.sortPriority ?? 0) + (p.rankingBoost ?? 0); }
function recency(p: Product) { const time = dateValue(p.createdAt); if (!time) return 0; return Math.max(0, 30 - (Date.now() - time) / 86_400_000); }
function personalScore(p: Product, affinity: Map<string, number>, favorites: Set<string>) { return (favorites.has(p.id) ? 100 : 0) + (affinity.get(p.categoryId ?? "") ?? 0) * 18 + (p.tags ?? []).reduce((n, t) => n + (affinity.get(normalize(t)) ?? 0) * 8, 0) + popularity(p) * .25; }
function buildAffinity(products: Product[], purchases: Map<string, number>, favorites: Set<string>) { const map = new Map<string, number>(); products.forEach((p) => { const weight = (purchases.get(p.id) ?? 0) + (favorites.has(p.id) ? 2 : 0); if (!weight) return; if (p.categoryId) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + weight); p.tags?.forEach((t) => map.set(normalize(t), (map.get(normalize(t)) ?? 0) + weight)); }); return map; }
function purchaseCounts(orders: PurchaseHistoryOrder[]) { const map = new Map<string, number>(); orders.filter((o) => !o.status || ["completed", "delivered"].includes(o.status)).forEach((o) => o.items?.forEach((i) => map.set(i.productId, (map.get(i.productId) ?? 0) + i.quantity))); return map; }
function keyword(p: Product, words: readonly string[]) { const text = normalize([p.name, p.description, ...(p.tags ?? []), ...(p.occasionTags ?? []), ...(p.searchKeywords ?? [])].filter(Boolean).join(" ")); return words.reduce((n, w) => n + (text.includes(normalize(w)) ? 1 : 0), 0); }
function normalize(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d"); }
function clock(value: string) { const [h = 0, m = 0] = value.split(":").map(Number); return h * 60 + m; }
function dateValue(value: Product["createdAt"]) { if (!value) return 0; if (value instanceof Date) return value.getTime(); const candidate = value as unknown as { seconds?: number; toDate?: () => Date }; return candidate.toDate?.().getTime() ?? (candidate.seconds ?? 0) * 1000; }
