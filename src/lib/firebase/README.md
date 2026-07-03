# 🔥 Firebase Integration

Thư mục này chứa các module tích hợp Firebase cho Bakery App.

## 📂 Cấu Trúc Files

```
firebase/
├── config.ts          # Firebase initialization & config
├── categories.ts      # Functions để lấy danh mục
├── products.ts        # Functions để lấy sản phẩm
├── seed-data.ts       # Dữ liệu mẫu để seed
├── index.ts           # Export tất cả functions
└── README.md          # File này
```

## 🔧 Usage

### Import Functions

```typescript
import {
  getAllCategories,
  getCategoryById,
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getNewProducts,
  getBestsellerProducts,
} from "@/lib/firebase";
```

### Lấy Danh Mục

```typescript
// Lấy tất cả danh mục (sorted by displayOrder)
const categories = await getAllCategories();

// Lấy 1 danh mục theo ID
const category = await getCategoryById("banh-sinh-nhat");
```

### Lấy Sản Phẩm

```typescript
// Lấy tất cả sản phẩm
const allProducts = await getAllProducts();

// Lấy sản phẩm theo danh mục
const cakeProducts = await getProductsByCategory("banh-sinh-nhat");

// Lấy sản phẩm nổi bật (isFeatured = true)
const featured = await getFeaturedProducts(10);

// Lấy sản phẩm mới (isNew = true, sorted by createdAt desc)
const newProducts = await getNewProducts(10);

// Lấy sản phẩm bán chạy (isBestseller = true)
const bestsellers = await getBestsellerProducts(10);
```

## 📊 Firestore Collections

### `categories`

```typescript
{
  id: string; // Document ID (e.g., "banh-sinh-nhat")
  name: string; // Tên hiển thị
  iconUrl: string; // URL hoặc emoji icon
  displayOrder: number; // Thứ tự sắp xếp
}
```

**Ví dụ:**

```json
{
  "id": "banh-sinh-nhat",
  "name": "Bánh Sinh Nhật",
  "iconUrl": "🎂",
  "displayOrder": 1
}
```

### `products`

```typescript
{
  id: string;                    // Document ID
  name: string;                  // Tên sản phẩm
  price: number;                 // Giá cơ bản (VND)
  imageUrl: string;              // URL hình ảnh
  categoryId: string;            // ID danh mục
  description?: string;          // Mô tả chi tiết
  availableForDelivery?: boolean;
  availableForPickup?: boolean;
  sizeOptions?: SizeOption[];    // Tùy chọn size
  flavorOptions?: FlavorOption[]; // Tùy chọn hương vị
  requiresMessage?: boolean;     // Có cho phép viết lời nhắn
  isFeatured?: boolean;          // Sản phẩm nổi bật
  isNew?: boolean;               // Sản phẩm mới
  isBestseller?: boolean;        // Bán chạy
  createdAt?: Date;              // Ngày tạo
}
```

**Ví dụ:**

```json
{
  "id": "banh-red-velvet",
  "name": "Bánh Red Velvet Cao Cấp",
  "price": 350000,
  "imageUrl": "https://images.unsplash.com/photo-...",
  "categoryId": "banh-sinh-nhat",
  "description": "Bánh Red Velvet với lớp kem cheese...",
  "availableForDelivery": true,
  "availableForPickup": true,
  "sizeOptions": [
    { "id": "16cm", "label": "16cm (4-6 người)", "priceAdjustment": 0 },
    { "id": "20cm", "label": "20cm (8-10 người)", "priceAdjustment": 100000 }
  ],
  "flavorOptions": [{ "id": "original", "label": "Kem Cheese Truyền Thống" }],
  "requiresMessage": true,
  "isFeatured": true,
  "isBestseller": true,
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```

## 🚀 Performance Tips

### Server-Side Rendering (Recommended)

Sử dụng trong Server Components để tận dụng Next.js caching:

```typescript
// app/page.tsx (Server Component)
export default async function HomePage() {
  const categories = await getAllCategories();
  const products = await getFeaturedProducts(10);

  return (
    <div>
      <CategoryGrid categories={categories} />
      <ProductList products={products} />
    </div>
  );
}
```

### Client-Side Fetching

Nếu cần fetch từ client, wrap trong useEffect:

```typescript
"use client";

import { useEffect, useState } from "react";
import { getAllCategories } from "@/lib/firebase";

export function CategoryList() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  return <div>{/* render categories */}</div>;
}
```

### Caching Strategy

- Server Components tự động cache theo Next.js default
- Thêm `revalidate` để control cache time:

```typescript
export const revalidate = 3600; // Revalidate mỗi 1 giờ

export default async function CategoryPage() {
  const categories = await getAllCategories();
  // ...
}
```

## 🔒 Security

- Firestore Rules đã cấu hình cho phép **read public**, **write authenticated**
- API keys trong `.env.local` **không được commit** lên Git
- Production nên thêm App Check để chống abuse

## 📈 Monitoring

Theo dõi usage tại [Firebase Console](https://console.firebase.google.com/):

- Firestore > Usage tab
- Kiểm tra reads/writes/deletes
- Free tier: 50K reads/day

## 🛠️ Maintenance

### Thêm Sản Phẩm Mới

1. Cập nhật `seed-data.ts`
2. Chạy `npm run seed` lại (sẽ overwrite)
3. Hoặc thêm trực tiếp qua Firebase Console

### Update Schema

Nếu thay đổi schema:

1. Update types trong `src/types/`
2. Update functions trong `firebase/*.ts`
3. Update seed-data nếu cần
4. Re-seed database

---

**Happy coding! 🎉**
