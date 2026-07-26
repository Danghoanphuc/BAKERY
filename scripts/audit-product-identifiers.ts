import { config as loadEnv } from "dotenv";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../src/lib/firebase/admin";
import { getAdminFirestore as getWholesaleAdminFirestore } from "../src/lib/wholesale-firebase/admin";
import {
  ensureProductIdentifiers,
  getIdentifierValidationError,
  getProductIdentifierValues,
} from "../src/lib/product-identifiers";
import type { Product } from "../src/types";

loadEnv({ path: ".env.local" });

const apply = process.argv.includes("--apply");
const wholesale = process.argv.includes("--wholesale");
const db = wholesale ? getWholesaleAdminFirestore() : getAdminFirestore();
const productsSnapshot = await db.collection("products").get();
const products = productsSnapshot.docs.map((snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
})) as Product[];

const owners = new Map<string, string[]>();
products.forEach((product) => {
  getProductIdentifierValues(product).forEach((value) => {
    owners.set(value, [...(owners.get(value) ?? []), product.id]);
  });
});
const duplicatedValues = new Set(
  [...owners].filter(([, productIds]) => productIds.length > 1).map(([value]) => value),
);

let clean = 0;
let skipped = 0;
let repaired = 0;

for (const product of products) {
  const prepared = ensureProductIdentifiers(product);
  const identifiers = getProductIdentifierValues(prepared);
  const duplicate = identifiers.find((value) => duplicatedValues.has(value));
  const validationError = getIdentifierValidationError(products, prepared, product.id);
  const generated = !product.sku?.trim() || !product.barcode?.trim();

  if (duplicate || validationError) {
    skipped += 1;
    console.warn(JSON.stringify({
      productId: product.id,
      name: product.name,
      status: "needs_manual_review",
      duplicate,
      validationError,
    }));
    continue;
  }

  if (!apply) {
    clean += 1;
    console.log(JSON.stringify({
      productId: product.id,
      name: product.name,
      status: generated ? "would_fill_missing_identifiers" : "clean",
    }));
    continue;
  }

  const productRef = db.collection("products").doc(product.id);
  const registryRefs = identifiers.map((value) =>
    db.collection("product_identifier_registry").doc(encodeURIComponent(value)));
  await db.runTransaction(async (transaction) => {
    const reservations = await Promise.all(registryRefs.map((reference) => transaction.get(reference)));
    if (reservations.some((snapshot) =>
      snapshot.exists && snapshot.data()?.productId !== product.id)) {
      throw new Error(`Identifier reservation conflict for ${product.id}`);
    }
    transaction.set(productRef, {
      sku: prepared.sku,
      barcode: prepared.barcode,
      sizeOptions: prepared.sizeOptions ?? [],
      flavorOptions: prepared.flavorOptions ?? [],
      variantCombinations: prepared.variantCombinations ?? [],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    registryRefs.forEach((reference, index) => transaction.set(reference, {
      productId: product.id,
      value: identifiers[index],
      updatedAt: FieldValue.serverTimestamp(),
    }));
  });
  repaired += 1;
}

console.log(JSON.stringify({
  project: wholesale ? "wholesale" : "retail",
  mode: apply ? "apply" : "audit",
  total: products.length,
  clean,
  repaired,
  skipped,
}));
