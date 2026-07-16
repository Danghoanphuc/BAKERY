/**
 * Script để thêm SKU, barcode, stock vào tất cả sản phẩm trong Firestore
 * Chạy: npx ts-node --esm scripts/seed-variant-sku.ts
 */

import admin from "firebase-admin";
import * as fs from "fs";

// Load service account
const serviceAccountPath = "C:/Users/ADMIN/.secrets/bakery-firebase-admin.json";
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Không tìm thấy service account:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function generateSku(categoryId: string, productId: string, suffix: string): string {
  const prefix = categoryId
    .replace("banh-", "")
    .replace("do-uong", "drink")
    .replace("phu-kien", "acc")
    .replace("combo-uu-dai", "combo")
    .toUpperCase()
    .substring(0, 4);
  return `${prefix}-${productId.substring(0, 8).toUpperCase()}-${suffix.toUpperCase()}`;
}

function generateBarcode(sku: string): string {
  const hash = Array.from(sku).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = `893${String(hash).padStart(10, "0").substring(0, 10)}`;
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

async function seedVariantSku() {
  console.log("📦 Đang fetch tất cả sản phẩm từ Firestore...");
  
  const productsRef = db.collection("products");
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log("❌ Không có sản phẩm nào trong DB");
    return;
  }

  console.log(`📋 Tìm thấy ${snapshot.docs.length} sản phẩm`);
  
  const batch = db.batch();
  let updatedCount = 0;
  let variantCount = 0;

  for (const productDoc of snapshot.docs) {
    const product = productDoc.data();
    const productId = productDoc.id;
    const categoryId = product.categoryId || "unknown";
    
    let hasChanges = false;
    const updatedSizeOptions = [...(product.sizeOptions || [])];
    const updatedFlavorOptions = [...(product.flavorOptions || [])];

    // Update sizeOptions
    for (let i = 0; i < updatedSizeOptions.length; i++) {
      const size = updatedSizeOptions[i];
      if (!size.sku) {
        const suffix = size.id.replace("cm", "CM").replace("small", "S").replace("medium", "M").replace("large", "L");
        size.sku = generateSku(categoryId, productId, `SZ-${suffix}`);
        size.barcode = generateBarcode(size.sku);
        size.stock = size.stock ?? 50;
        hasChanges = true;
        variantCount++;
      }
    }

    // Update flavorOptions
    for (let i = 0; i < updatedFlavorOptions.length; i++) {
      const flavor = updatedFlavorOptions[i];
      if (!flavor.sku) {
        const suffix = flavor.id.toUpperCase().substring(0, 8);
        flavor.sku = generateSku(categoryId, productId, `FL-${suffix}`);
        flavor.barcode = generateBarcode(flavor.sku);
        flavor.stock = flavor.stock ?? 30;
        hasChanges = true;
        variantCount++;
      }
    }

    if (hasChanges) {
      batch.update(productDoc.ref, {
        sizeOptions: updatedSizeOptions,
        flavorOptions: updatedFlavorOptions,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`💾 Đang commit ${updatedCount} sản phẩm, ${variantCount} biến thể...`);
    await batch.commit();
    console.log("✅ Hoàn tất!");
  } else {
    console.log("✨ Tất cả sản phẩm đã có SKU/barcode");
  }
}

seedVariantSku()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  });