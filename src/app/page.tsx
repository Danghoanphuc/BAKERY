import { Header } from "@/components/layout";
import { StickyCart } from "@/components/layout/StickyCart";
import {
  SearchBar,
  PromoBanner,
  DeliveryModeToggle,
  CategoryGrid,
} from "@/features/home/components";
import { HomepageClient } from "./homepage-client";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { PromoBannerProps } from "@/features/home/components/PromoBanner";

// Server-side data fetching (mock data)
async function getCategories(): Promise<Category[]> {
  // In a real app, this would fetch from an API
  return [
    {
      id: "1",
      name: "Bánh sinh nhật",
      iconUrl: "https://loremflickr.com/32/32?lock=1",
      displayOrder: 1,
    },
    {
      id: "2",
      name: "Bánh mì ngọt",
      iconUrl: "https://loremflickr.com/32/32?lock=2",
      displayOrder: 2,
    },
    {
      id: "3",
      name: "Bánh lạnh",
      iconUrl: "https://loremflickr.com/32/32?lock=3",
      displayOrder: 3,
    },
    {
      id: "4",
      name: "Phụ kiện",
      iconUrl: "https://loremflickr.com/32/32?lock=4",
      displayOrder: 4,
    },
    {
      id: "5",
      name: "Đồ uống",
      iconUrl: "https://loremflickr.com/32/32?lock=5",
      displayOrder: 5,
    },
    {
      id: "6",
      name: "Bánh kem",
      iconUrl: "https://loremflickr.com/32/32?lock=6",
      displayOrder: 6,
    },
    {
      id: "7",
      name: "Bánh quy",
      iconUrl: "https://loremflickr.com/32/32?lock=7",
      displayOrder: 7,
    },
    {
      id: "8",
      name: "Bánh tart",
      iconUrl: "https://loremflickr.com/32/32?lock=8",
      displayOrder: 8,
    },
  ];
}

async function getFeaturedProducts(): Promise<{
  suggested: Product[];
  newToday: Product[];
  bestsellers: Product[];
}> {
  // In a real app, this would fetch from an API
  const allProducts: Product[] = [
    {
      id: "1",
      name: "Bánh Red Velvet",
      price: 250000,
      imageUrl: "https://loremflickr.com/150/150?lock=1",
      categoryId: "1",
      description: "Bánh Red Velvet thơm ngon với kem cheese",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "16cm", label: "16cm", priceAdjustment: 0 },
        { id: "20cm", label: "20cm", priceAdjustment: 50000 },
        { id: "24cm", label: "24cm", priceAdjustment: 100000 },
      ],
      flavorOptions: [
        { id: "original", label: "Truyền thống" },
        { id: "cheese", label: "Cream cheese" },
        { id: "dark", label: "Dark chocolate" },
      ],
      requiresMessage: true,
    },
    {
      id: "2",
      name: "Bánh Chocolate",
      price: 200000,
      imageUrl: "https://loremflickr.com/150/150?lock=2",
      categoryId: "1",
      description: "Bánh chocolate đậm đà hương vị",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "16cm", label: "16cm", priceAdjustment: 0 },
        { id: "20cm", label: "20cm", priceAdjustment: 50000 },
      ],
      flavorOptions: [
        { id: "milk", label: "Sô-cô-la sữa" },
        { id: "dark", label: "Sô-cô-la đen" },
      ],
      requiresMessage: true,
    },
    {
      id: "3",
      name: "Bánh Vanilla",
      price: 180000,
      imageUrl: "https://loremflickr.com/150/150?lock=3",
      categoryId: "1",
      description: "Bánh vanilla nhẹ nhàng thơm mát",
      availableForDelivery: true,
      availableForPickup: true,
      requiresMessage: true,
    },
    {
      id: "4",
      name: "Bánh Tiramisu",
      price: 300000,
      imageUrl: "https://loremflickr.com/150/150?lock=4",
      categoryId: "3",
      description: "Bánh Tiramisu Ý nguyên bản",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "small", label: "Nhỏ (4 người)", priceAdjustment: 0 },
        { id: "medium", label: "Vừa (6-8 người)", priceAdjustment: 80000 },
        { id: "large", label: "Lớn (10-12 người)", priceAdjustment: 150000 },
      ],
      flavorOptions: [
        { id: "classic", label: "Cổ điển" },
        { id: "mocha", label: "Mocha" },
      ],
    },
    {
      id: "5",
      name: "Bánh Opera",
      price: 320000,
      imageUrl: "https://loremflickr.com/150/150?lock=5",
      categoryId: "3",
      description: "Bánh Opera nhiều lớp tinh tế",
      availableForDelivery: true,
      availableForPickup: true,
    },
    {
      id: "6",
      name: "Croissant Bơ",
      price: 45000,
      imageUrl: "https://loremflickr.com/150/150?lock=6",
      categoryId: "2",
      description: "Croissant bơ tươi giòn tan",
      availableForDelivery: true,
      availableForPickup: true,
    },
    {
      id: "7",
      name: "Bánh Mì Sandwich",
      price: 55000,
      imageUrl: "https://loremflickr.com/150/150?lock=7",
      categoryId: "2",
      description: "Bánh mì sandwich thịt nguội",
      availableForDelivery: true,
      availableForPickup: true,
    },
    {
      id: "8",
      name: "Matcha Latte",
      price: 65000,
      imageUrl: "https://loremflickr.com/150/150?lock=8",
      categoryId: "5",
      description: "Matcha latte đậm đà hương trà",
      availableForDelivery: true,
      availableForPickup: true,
    },
  ];

  return {
    suggested: allProducts.slice(0, 4),
    newToday: allProducts.slice(4, 7),
    bestsellers: [
      allProducts[0],
      allProducts[1],
      allProducts[3],
      allProducts[4],
    ],
  };
}

function getPromoBannerData(): PromoBannerProps {
  return {
    title: "Giảm 20% tất cả bánh sinh nhật",
    description:
      "Áp dụng cho đơn hàng từ 500.000đ. Có hiệu lực đến hết tháng này.",
    imageUrl: "https://loremflickr.com/400/150?lock=promo",
    href: "/promotion/birthday-cakes",
  };
}

export default async function HomePage() {
  // Server-side data fetching
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
  ]);

  const promoBannerData = getPromoBannerData();

  return (
    <>
      {/* Header - Sticky positioned */}
      <Header />

      {/* Main content area with proper spacing */}
      <main className="min-h-screen pt-14 pb-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          {/* SearchBar Section */}
          <section className="px-4 lg:px-6 pt-4 pb-6">
            <SearchBar />
          </section>

          {/* PromoBanner Section */}
          <section className="px-4 lg:px-6 pb-6">
            <PromoBanner {...promoBannerData} />
          </section>

          {/* DeliveryModeToggle Section */}
          <section className="px-4 lg:px-6 pb-6">
            <DeliveryModeToggle />
          </section>

          {/* CategoryGrid Section */}
          <section className="px-4 lg:px-6 pb-8">
            <CategoryGrid categories={categories} />
          </section>

          {/* ProductCollection Sections */}
          <div className="space-y-8">
            {/* Gợi ý cho bạn */}
            <section>
              <HomepageClient
                title="Gợi ý cho bạn"
                products={featuredProducts.suggested}
              />
            </section>

            {/* Mới ra lò sáng nay */}
            <section>
              <HomepageClient
                title="Mới ra lò sáng nay"
                products={featuredProducts.newToday}
              />
            </section>

            {/* Bán chạy nhất */}
            <section>
              <HomepageClient
                title="Bán chạy nhất"
                products={featuredProducts.bestsellers}
              />
            </section>
          </div>
        </div>
      </main>

      {/* StickyCart - Fixed bottom positioning */}
      <StickyCart />
    </>
  );
}
