import type { Product } from "@/types/product";

export type HomeRecommendationKey = "timely" | "repurchase" | "popular";

export interface PurchaseHistoryItem {
  productId: string;
  quantity: number;
}

export interface PurchaseHistoryOrder {
  status?: string;
  items?: PurchaseHistoryItem[];
}

export interface HomeRecommendationGroup {
  key: HomeRecommendationKey;
  title: string;
  description: string;
  products: Product[];
  productReason: string;
}

interface BuildHomeRecommendationsOptions {
  products: Product[];
  orders?: PurchaseHistoryOrder[];
  favoriteIds?: string[];
  hour?: number;
  limitPerGroup?: number;
}

const TIME_SLOTS = [
  {
    from: 5,
    to: 11,
    title: "Bữa sáng nhẹ nhàng",
    description: "Những món hợp để bắt đầu ngày mới",
    reason: "Hợp buổi sáng",
    keywords: ["croissant", "bánh mì", "cà phê", "coffee", "sandwich"],
  },
  {
    from: 11,
    to: 17,
    title: "Ngọt ngào buổi chiều",
    description: "Bánh và thức uống cho giờ nghỉ",
    reason: "Hợp buổi chiều",
    keywords: ["trà", "tea", "bánh ngọt", "cookie", "tart", "su kem"],
  },
  {
    from: 17,
    to: 24,
    title: "Chia sẻ cùng nhau",
    description: "Món ngon cho buổi tối và những cuộc hẹn",
    reason: "Hợp để sẻ chia",
    keywords: ["combo", "set", "sinh nhật", "cake", "bánh kem", "tiệc"],
  },
] as const;

const NIGHT_SLOT = {
  ...TIME_SLOTS[2],
  title: "Chuẩn bị cho ngày mai",
  description: "Các món có thể đặt trước từ hôm nay",
  reason: "Có thể đặt trước",
};

export function buildHomeRecommendations({
  products,
  orders = [],
  favoriteIds = [],
  hour = new Date().getHours(),
  limitPerGroup = 6,
}: BuildHomeRecommendationsOptions): HomeRecommendationGroup[] {
  const availableProducts = products.filter(
    (product) => product.isAvailable !== false && (product.stock ?? 1) > 0,
  );
  const usedIds = new Set<string>();
  const groups: HomeRecommendationGroup[] = [];
  const timeSlot = getTimeSlot(hour);

  const timelyProducts = rankTimelyProducts(availableProducts, timeSlot.keywords)
    .filter((product) => !usedIds.has(product.id))
    .slice(0, limitPerGroup);
  addGroup(groups, usedIds, {
    key: "timely",
    title: timeSlot.title,
    description: timeSlot.description,
    productReason: timeSlot.reason,
    products: timelyProducts,
  });

  const purchaseCounts = getPurchaseCounts(orders);
  const repurchaseProducts = availableProducts
    .filter((product) => purchaseCounts.has(product.id) && !usedIds.has(product.id))
    .sort(
      (left, right) =>
        (purchaseCounts.get(right.id) ?? 0) - (purchaseCounts.get(left.id) ?? 0),
    )
    .slice(0, limitPerGroup);
  addGroup(groups, usedIds, {
    key: "repurchase",
    title: "Mua lại món bạn thích",
    description: "Từ những đơn hàng đã hoàn tất của bạn",
    productReason: "Bạn từng mua món này",
    products: repurchaseProducts,
  });

  const favoriteSet = new Set(favoriteIds);
  const popularProducts = [...availableProducts]
    .filter((product) => !usedIds.has(product.id))
    .sort(
      (left, right) =>
        getPopularityScore(right, favoriteSet) -
        getPopularityScore(left, favoriteSet),
    )
    .slice(0, limitPerGroup);
  addGroup(groups, usedIds, {
    key: "popular",
    title: "Đang được yêu thích",
    description: "Những lựa chọn nổi bật tại tiệm",
    productReason: "Được nhiều khách lựa chọn",
    products: popularProducts,
  });

  return groups;
}

function addGroup(
  groups: HomeRecommendationGroup[],
  usedIds: Set<string>,
  group: HomeRecommendationGroup,
) {
  if (group.products.length === 0) return;
  group.products.forEach((product) => usedIds.add(product.id));
  groups.push(group);
}

function getTimeSlot(hour: number) {
  return (
    TIME_SLOTS.find((slot) => hour >= slot.from && hour < slot.to) ?? NIGHT_SLOT
  );
}

function rankTimelyProducts(products: Product[], keywords: readonly string[]) {
  return [...products].sort((left, right) => {
    const scoreDifference =
      getKeywordScore(right, keywords) - getKeywordScore(left, keywords);
    return scoreDifference || getBaseMerchandisingScore(right) - getBaseMerchandisingScore(left);
  });
}

function getKeywordScore(product: Product, keywords: readonly string[]) {
  const searchableText = normalizeText(
    [
      product.name,
      product.description,
      ...(product.tags ?? []),
      ...(product.occasionTags ?? []),
      ...(product.searchKeywords ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return keywords.reduce(
    (score, keyword) => score + (searchableText.includes(normalizeText(keyword)) ? 10 : 0),
    0,
  );
}

function getPurchaseCounts(orders: PurchaseHistoryOrder[]) {
  const counts = new Map<string, number>();
  orders
    .filter((order) => !order.status || ["completed", "delivered"].includes(order.status))
    .forEach((order) =>
      order.items?.forEach((item) =>
        counts.set(item.productId, (counts.get(item.productId) ?? 0) + item.quantity),
      ),
    );
  return counts;
}

function getPopularityScore(product: Product, favoriteIds: Set<string>) {
  return (
    getBaseMerchandisingScore(product) +
    (favoriteIds.has(product.id) ? 20 : 0) +
    (product.isNew ? 6 : 0)
  );
}

function getBaseMerchandisingScore(product: Product) {
  return (
    (product.isBestseller ? 40 : 0) +
    (product.isFeatured ? 20 : 0) +
    (product.sortPriority ?? 0)
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
