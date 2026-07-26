import { config as loadEnv } from "dotenv";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "../src/lib/firebase/admin";
import { getAdminFirestore as getWholesaleAdminFirestore } from "../src/lib/wholesale-firebase/admin";
import {
  financeIngredientToProduct,
  isCanonicalIngredientSku,
} from "../src/lib/ingredient-product-projection";
import {
  createNextProductSku,
  ensureProductIdentifiers,
  getIdentifierValidationError,
  getProductIdentifierValues,
} from "../src/lib/product-identifiers";
import type { FinanceIngredient, Product } from "../src/types";

loadEnv({ path: ".env.local" });

const apply = process.argv.includes("--apply");
const repairSkus = process.argv.includes("--repair-skus");
const wholesale = process.argv.includes("--wholesale");
const db = wholesale ? getWholesaleAdminFirestore() : getAdminFirestore();

const [ingredientSnapshot, productSnapshot] = await Promise.all([
  db.collection("finance_ingredients").get(),
  db.collection("products").get(),
]);

const ingredients = ingredientSnapshot.docs.map((snapshot) => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    code: String(data.code ?? ""),
    groupCode:
      typeof data.groupCode === "string" ? data.groupCode : undefined,
    name: String(data.name ?? ""),
    baseUnit: data.baseUnit,
    costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
    isActive: data.isActive !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as FinanceIngredient;
});
const products = productSnapshot.docs.map((snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
})) as Product[];

let clean = 0;
let created = 0;
let skipped = 0;
let cleanSkus = 0;
let repairedSkus = 0;
let skippedSkus = 0;

for (const ingredient of ingredients) {
  const existing = products.find((product) => product.id === ingredient.id);
  if (existing) {
    if (existing.itemType === "ingredient") {
      clean += 1;
      continue;
    }
    skipped += 1;
    console.warn(JSON.stringify({
      ingredientId: ingredient.id,
      code: ingredient.code,
      status: "id_conflict",
      existingItemType: existing.itemType ?? "finished_good",
    }));
    continue;
  }

  const prepared = ensureProductIdentifiers(
    financeIngredientToProduct(ingredient),
  );
  const validationError = getIdentifierValidationError(products, prepared);
  if (validationError) {
    skipped += 1;
    console.warn(JSON.stringify({
      ingredientId: ingredient.id,
      code: ingredient.code,
      status: "identifier_conflict",
      validationError,
    }));
    continue;
  }

  if (!apply) {
    console.log(JSON.stringify({
      ingredientId: ingredient.id,
      code: ingredient.code,
      name: ingredient.name,
      status: "would_create",
    }));
    continue;
  }

  const { id, createdAt, updatedAt, ...productData } = prepared;
  const productRef = db.collection("products").doc(id);
  const identifiers = getProductIdentifierValues(prepared);
  const registryRefs = identifiers.map((value) =>
    db
      .collection("product_identifier_registry")
      .doc(encodeURIComponent(value)),
  );

  await db.runTransaction(async (transaction) => {
    const [productDocument, ...reservations] = await Promise.all([
      transaction.get(productRef),
      ...registryRefs.map((reference) => transaction.get(reference)),
    ]);
    if (productDocument.exists) return;
    const conflictingReservation = reservations.find(
      (reservation) =>
        reservation.exists &&
        reservation.data()?.productId !== ingredient.id,
    );
    if (conflictingReservation) {
      throw new Error(`Identifier reservation conflict for ${ingredient.id}`);
    }

    transaction.create(
      productRef,
      stripUndefined({
        ...productData,
        createdAt: createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: updatedAt ?? FieldValue.serverTimestamp(),
      }),
    );
    registryRefs.forEach((reference, index) =>
      transaction.set(
        reference,
        {
          productId: ingredient.id,
          value: identifiers[index],
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  });

  products.push(prepared);
  created += 1;
}

if (repairSkus) {
  for (const ingredient of ingredients) {
    const productIndex = products.findIndex(
      (product) => product.id === ingredient.id,
    );
    if (productIndex < 0) {
      skippedSkus += 1;
      continue;
    }
    const current = products[productIndex];
    if (
      current.itemType !== "ingredient" ||
      isCanonicalIngredientSku(current.sku)
    ) {
      cleanSkus += 1;
      continue;
    }

    const sku = createNextProductSku(products, {
      itemType: "ingredient",
      name: current.name,
    });
    const prepared = ensureProductIdentifiers({ ...current, sku });
    const validationError = getIdentifierValidationError(
      products,
      prepared,
      current.id,
    );
    if (validationError) {
      skippedSkus += 1;
      console.warn(
        JSON.stringify({
          ingredientId: ingredient.id,
          oldSku: current.sku,
          nextSku: sku,
          status: "sku_conflict",
          validationError,
        }),
      );
      continue;
    }

    console.log(
      JSON.stringify({
        ingredientId: ingredient.id,
        name: ingredient.name,
        oldSku: current.sku,
        nextSku: sku,
        status: apply ? "updating_sku" : "would_update_sku",
      }),
    );

    if (apply) {
      await updateIngredientSku({
        ingredient,
        current,
        prepared,
      });
      repairedSkus += 1;
    }
    products[productIndex] = prepared;
  }
}

console.log(
  JSON.stringify({
    project: wholesale ? "wholesale" : "retail",
    mode: apply ? "apply" : "audit",
    financeIngredients: ingredients.length,
    inventoryProducts: products.length,
    existingIngredientProducts: clean,
    created,
    skipped,
    pending: apply ? 0 : ingredients.length - clean - skipped,
    skuRepair: repairSkus,
    cleanSkus,
    repairedSkus,
    skippedSkus,
  }),
);

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate() as Date;
  }
  return undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

async function updateIngredientSku({
  ingredient,
  current,
  prepared,
}: {
  ingredient: FinanceIngredient;
  current: Product;
  prepared: Product;
}) {
  const productRef = db.collection("products").doc(current.id);
  const financeRef = db.collection("finance_ingredients").doc(ingredient.id);
  const oldIdentifiers = getProductIdentifierValues(current);
  const nextIdentifiers = getProductIdentifierValues(prepared);
  const nextIdentifierSet = new Set(nextIdentifiers);
  const nextRegistryRefs = nextIdentifiers.map((value) =>
    db
      .collection("product_identifier_registry")
      .doc(encodeURIComponent(value)),
  );
  const staleRegistryRefs = oldIdentifiers
    .filter((value) => !nextIdentifierSet.has(value))
    .map((value) =>
      db
        .collection("product_identifier_registry")
        .doc(encodeURIComponent(value)),
    );
  const oldCodeRef = db
    .collection("finance_ingredient_codes")
    .doc(encodeURIComponent(ingredient.code));
  const nextCodeRef = db
    .collection("finance_ingredient_codes")
    .doc(encodeURIComponent(prepared.sku ?? ""));

  await db.runTransaction(async (transaction) => {
    const [
      productDocument,
      financeDocument,
      nextCodeDocument,
      oldCodeDocument,
      nextReservations,
      staleReservations,
    ] = await Promise.all([
      transaction.get(productRef),
      transaction.get(financeRef),
      transaction.get(nextCodeRef),
      transaction.get(oldCodeRef),
      Promise.all(
        nextRegistryRefs.map((reference) => transaction.get(reference)),
      ),
      Promise.all(
        staleRegistryRefs.map((reference) => transaction.get(reference)),
      ),
    ]);

    if (!productDocument.exists || !financeDocument.exists) {
      throw new Error(`Ingredient projection missing for ${ingredient.id}`);
    }
    if (
      nextReservations.some(
        (reservation) =>
          reservation.exists &&
          reservation.data()?.productId !== ingredient.id,
      )
    ) {
      throw new Error(`Identifier reservation conflict for ${ingredient.id}`);
    }
    if (
      nextCodeDocument.exists &&
      nextCodeDocument.data()?.ingredientId !== ingredient.id
    ) {
      throw new Error(`Finance code reservation conflict for ${ingredient.id}`);
    }

    transaction.update(productRef, {
      sku: prepared.sku,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(financeRef, {
      code: prepared.sku,
      updatedAt: FieldValue.serverTimestamp(),
    });
    nextRegistryRefs.forEach((reference, index) =>
      transaction.set(
        reference,
        {
          productId: ingredient.id,
          value: nextIdentifiers[index],
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
    staleRegistryRefs.forEach((reference, index) => {
      if (
        staleReservations[index]?.exists &&
        staleReservations[index]?.data()?.productId === ingredient.id
      ) {
        transaction.delete(reference);
      }
    });
    if (
      oldCodeRef.path !== nextCodeRef.path &&
      oldCodeDocument.exists &&
      oldCodeDocument.data()?.ingredientId === ingredient.id
    ) {
      transaction.delete(oldCodeRef);
    }
    transaction.set(
      nextCodeRef,
      {
        ingredientId: ingredient.id,
        code: prepared.sku,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
