/**
 * Script để seed dữ liệu lên Firebase Firestore
 *
 * CÁCH CHẠY:
 * 1. Đảm bảo đã cấu hình Firebase trong .env.local
 * 2. Chạy: npx tsx scripts/seed-firebase.ts
 */

import {
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../src/lib/firebase/config";
import { categories, orders, products } from "../src/lib/firebase/seed-data";

async function seedCategories() {
  console.log("🔥 Bắt đầu seed danh mục...");

  const batch = writeBatch(db);

  for (const category of categories) {
    const { id, ...data } = category;
    const docRef = doc(db, "categories", id);
    batch.set(docRef, data);
  }

  await batch.commit();
  console.log(`✅ Đã seed ${categories.length} danh mục thành công!`);
}

async function seedProducts() {
  console.log("🔥 Bắt đầu seed sản phẩm...");

  // Firestore batch có giới hạn 500 operations
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let count = 0;

  for (const product of products) {
    const { id, createdAt, ...data } = product;
    const docRef = doc(db, "products", id);

    // Convert Date to Firestore Timestamp
    const firestoreData = {
      ...data,
      stock: data.stock ?? 20,
      isAvailable: data.isAvailable ?? true,
      ...(createdAt && { createdAt: Timestamp.fromDate(createdAt) }),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    batch.set(docRef, firestoreData);
    count++;

    // Commit batch khi đạt giới hạn
    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`   Đã seed ${count} sản phẩm...`);
    }
  }

  // Commit batch cuối cùng
  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
  }

  console.log(`✅ Đã seed ${products.length} sản phẩm thành công!`);
}

async function seedOrders() {
  console.log("🔥 Bắt đầu seed đơn hàng...");

  const batch = writeBatch(db);

  for (const order of orders) {
    const { id, createdAt, updatedAt, ...data } = order;
    const docRef = doc(db, "orders", id);

    batch.set(docRef, {
      ...data,
      createdAt: Timestamp.fromDate(createdAt),
      updatedAt: Timestamp.fromDate(updatedAt),
    });
  }

  await batch.commit();
  console.log(`✅ Đã seed ${orders.length} đơn hàng thành công!`);
}

async function main() {
  try {
    console.log("🚀 Bắt đầu seed dữ liệu vào Firebase...\n");

    await seedCategories();
    await seedProducts();
    await seedOrders();

    console.log("\n🎉 Seed dữ liệu hoàn tất!");
    console.log("📊 Tổng kết:");
    console.log(`   - ${categories.length} danh mục`);
    console.log(`   - ${products.length} sản phẩm`);
    console.log(`   - ${orders.length} đơn hàng`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    process.exit(1);
  }
}

main();
