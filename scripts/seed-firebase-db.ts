/**
 * Script seed dữ liệu lên Firebase Firestore
 * Chạy: npx tsx scripts/seed-firebase-db.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";

// Load env
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categories = [
  { name: "Bánh Sinh Nhật", iconUrl: "🎂", displayOrder: 1 },
  { name: "Bánh Mì Ngọt", iconUrl: "🥐", displayOrder: 2 },
  { name: "Bánh Kem Lạnh", iconUrl: "🍰", displayOrder: 3 },
  { name: "Bánh Quy", iconUrl: "🍪", displayOrder: 4 },
  { name: "Bánh Tart & Pie", iconUrl: "🥧", displayOrder: 5 },
  { name: "Đồ Uống", iconUrl: "☕", displayOrder: 6 },
  { name: "Phụ Kiện Tiệc", iconUrl: "🎈", displayOrder: 7 },
  { name: "Combo Ưu Đãi", iconUrl: "🎁", displayOrder: 8 },
];

async function main() {
  console.log("🚀 Bắt đầu seed Firebase...\n");

  try {
    // Seed categories
    console.log("🔥 Seed categories...");
    const categoryIds: Record<number, string> = {};

    for (let i = 0; i < categories.length; i++) {
      const docRef = await addDoc(collection(db, "categories"), {
        ...categories[i],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      categoryIds[i] = docRef.id;
      console.log(`   ✓ ${categories[i].name}`);
    }

    console.log(`✅ Đã tạo ${categories.length} danh mục\n`);

    // Seed products
    console.log("🔥 Seed products...");
    const products = [
      {
        name: "Bánh Red Velvet Cao Cấp",
        price: 350000,
        imageUrl:
          "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400",
        categoryId: categoryIds[0],
        description: "Bánh Red Velvet với lớp kem cheese Philly mịn màng",
        isFeatured: true,
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        requiresMessage: true,
        stock: 10,
        sizeOptions: [
          { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
          { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 100000 },
        ],
        flavorOptions: [
          { id: "original", label: "Kem Cheese Truyền Thống" },
          { id: "dark-choco", label: "Kem Dark Chocolate" },
        ],
      },
      {
        name: "Croissant Bơ Pháp",
        price: 35000,
        imageUrl:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
        categoryId: categoryIds[1],
        description: "Croissant bơ lạt Pháp, 27 lớp giòn rụm",
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 50,
      },
      {
        name: "Tiramisu Ý Truyền Thống",
        price: 450000,
        imageUrl:
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
        categoryId: categoryIds[2],
        description: "Tiramisu Ý chính gốc với mascarpone nhập khẩu",
        isFeatured: true,
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 8,
      },
      {
        name: "Cookie Socola Chip Mỹ",
        price: 45000,
        imageUrl:
          "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
        categoryId: categoryIds[3],
        description: "Cookie Mỹ với chip socola đen Bỉ",
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 30,
      },
      {
        name: "Egg Tart Bồ Đào Nha",
        price: 30000,
        imageUrl:
          "https://images.unsplash.com/photo-1587241321921-91a834d82ffc?w=400",
        categoryId: categoryIds[4],
        description: "Bánh tart trứng kiểu Bồ Đào Nha, vỏ giòn xốp",
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 40,
      },
      {
        name: "Matcha Latte Nóng/Đá",
        price: 55000,
        imageUrl:
          "https://images.unsplash.com/photo-1536013485-e5b39f5cbbfd?w=400",
        categoryId: categoryIds[5],
        description: "Trà xanh matcha Nhật nguyên chất",
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 100,
      },
      {
        name: "Nến Sinh Nhật Cao Cấp (Set 10)",
        price: 25000,
        imageUrl:
          "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400",
        categoryId: categoryIds[6],
        description: "Bộ 10 nến sinh nhật không khói",
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 200,
      },
      {
        name: "Combo Tiệc Nhỏ (4-6 người)",
        price: 550000,
        imageUrl:
          "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400",
        categoryId: categoryIds[7],
        description: "Gồm: 1 bánh sinh nhật 16cm, 6 croissant, 6 cookie",
        isFeatured: true,
        isBestseller: true,
        isAvailable: true,
        availableForDelivery: true,
        availableForPickup: true,
        stock: 5,
      },
    ];

    for (const product of products) {
      await addDoc(collection(db, "products"), {
        ...product,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`   ✓ ${product.name}`);
    }

    console.log(`✅ Đã tạo ${products.length} sản phẩm\n`);

    console.log("🎉 Seed Firebase hoàn tất!");
    console.log(`📊 Tổng kết:`);
    console.log(`   - ${categories.length} danh mục`);
    console.log(`   - ${products.length} sản phẩm`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

main();
