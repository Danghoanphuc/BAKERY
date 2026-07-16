/**
 * Migrate legacy product.categoryId values (category names) to canonical
 * category document IDs.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-category-ids.ts
 *   npx tsx scripts/migrate-legacy-category-ids.ts --dry-run
 */

import admin from "firebase-admin";
import * as fs from "fs";

const serviceAccountPath = "C:/Users/ADMIN/.secrets/bakery-firebase-admin.json";
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Không tìm thấy service account:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const dryRun = process.argv.includes("--dry-run");

function normalizeCategoryReference(value?: string) {
  if (!value) return "";
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // keep original
  }
  return decoded
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function migrate() {
  console.log(
    dryRun
      ? "🔍 Dry run — không ghi Firestore"
      : "🛠️  Migrating legacy categoryId values…",
  );

  const [categoriesSnap, productsSnap] = await Promise.all([
    db.collection("categories").get(),
    db.collection("products").get(),
  ]);

  const categories = categoriesSnap.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name ?? ""),
  }));

  let updated = 0;
  let skipped = 0;
  let unresolved = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const productDoc of productsSnap.docs) {
    const data = productDoc.data();
    const current = typeof data.categoryId === "string" ? data.categoryId : "";
    if (!current) {
      skipped++;
      continue;
    }

    const exactId = categories.find((category) => category.id === current);
    if (exactId) {
      skipped++;
      continue;
    }

    const normalized = normalizeCategoryReference(current);
    const match = categories.find(
      (category) =>
        normalizeCategoryReference(category.id) === normalized ||
        normalizeCategoryReference(category.name) === normalized,
    );

    if (!match) {
      unresolved++;
      console.warn(
        `⚠️  Unresolved: product=${productDoc.id} categoryId="${current}"`,
      );
      continue;
    }

    console.log(
      `✓ ${productDoc.id}: "${current}" → "${match.id}" (${match.name})`,
    );
    updated++;

    if (!dryRun) {
      batch.update(productDoc.ref, {
        categoryId: match.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log(
    `\nDone. updated=${updated} skipped=${skipped} unresolved=${unresolved}`,
  );
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
