import type { Product } from "@/types/product";

export interface HomeCategoryVisual {
  name: string;
  imageUrl: string;
  href: string;
}

export interface HomePromoTile {
  title: string;
  description: string;
  imageUrl: string;
  href: string;
  tone: "green" | "pink" | "gold";
}

export interface HomeMarketingTile {
  title: string;
  description: string;
  imageUrl: string;
  badge?: string;
}

export const heroReward = {
  customerName: "Hoàn Phúc",
  pointsToUse: 400,
  imageUrl:
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=90",
  href: "/rewards",
};

export const homePromoTiles: HomePromoTile[] = [
  {
    title: "Góc Bánh Healthy",
    description: "Nguyên cám · Keto · Ít ngọt",
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=520&q=85",
    href: "/search?q=healthy",
    tone: "green",
  },
  {
    title: "Bánh Sự Kiện",
    description: "Sinh nhật · Kỷ niệm",
    imageUrl:
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=520&q=85",
    href: "/search?q=b%C3%A1nh%20s%E1%BB%B1%20ki%E1%BB%87n",
    tone: "pink",
  },
];

export const defaultCategoryVisuals: HomeCategoryVisual[] = [
  {
    name: "Bánh Mì",
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=280&q=85",
    href: "/category",
  },
  {
    name: "Bánh Lạnh",
    imageUrl:
      "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=280&q=85",
    href: "/category",
  },
  {
    name: "Bánh Nướng",
    imageUrl:
      "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=280&q=85",
    href: "/category",
  },
  {
    name: "Đồ Uống",
    imageUrl:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=280&q=85",
    href: "/category",
  },
  {
    name: "Phụ Kiện",
    imageUrl:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=280&q=85",
    href: "/category",
  },
];

export const marketingTiles: HomeMarketingTile[] = [
  {
    title: "Mới Ra Lò",
    description: "Thơm ngon mỗi ngày",
    badge: "Mới",
    imageUrl:
      "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=520&q=90",
  },
  {
    title: "Best Seller",
    description: "Bán chạy nhất tuần",
    imageUrl:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=520&q=90",
  },
  {
    title: "Combo Tiết Kiệm",
    description: "Ưu đãi hấp dẫn",
    imageUrl:
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=520&q=90",
  },
];

export const fallbackFavoriteProducts: Product[] = [
  {
    id: "demo-croissant",
    name: "Croissant bơ",
    price: 32000,
    imageUrl:
      "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=640&q=90",
    categoryId: "demo",
    isFeatured: true,
  },
  {
    id: "demo-red-velvet",
    name: "Red Velvet mini",
    price: 49000,
    imageUrl:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=640&q=90",
    categoryId: "demo",
    isFeatured: true,
  },
  {
    id: "demo-peach-tea",
    name: "Trà đào cam sả",
    price: 38000,
    imageUrl:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=90",
    categoryId: "demo",
    isFeatured: true,
  },
];
