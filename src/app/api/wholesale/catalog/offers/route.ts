import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  activateRecipe,
  addRecipeVersion,
  buildProductCostSummaries,
} from "@/features/wholesale-finance";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import {
  createWholesaleProduct,
  deleteWholesaleRecord,
  getWholesaleRecord,
  listWholesaleRecords,
} from "@/lib/wholesale-admin-store";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import {
  createNextProductSku,
  ensureProductIdentifiers,
  getIdentifierValidationError,
} from "@/lib/product-identifiers";
import {
  validateWholesaleFinishedProductInput,
} from "@/lib/wholesale-product-offer";
import type { Product } from "@/types";

const OFFERS = "wholesale_products";
const BALANCES = "inventory_balances";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  const offers = await listWholesaleRecords(OFFERS);
  return NextResponse.json(
    productId
      ? offers.filter((offer) => String(offer.productId ?? "") === productId)
      : offers,
  );
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  let createdProductId: string | null = null;
  let createdOfferId: string | null = null;
  let createdRecipeId: string | null = null;
  try {
    const validation = validateWholesaleFinishedProductInput(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const input = validation.value;
    if (input.source === "new" && !input.bom) {
      return NextResponse.json(
        { error: "Vui lòng tạo BOM cho thành phẩm." },
        { status: 400 },
      );
    }
    const products = await listWholesaleRecords("products") as unknown as Product[];
    let product: Product;

    if (input.source === "existing") {
      const existing = await getWholesaleRecord("products", input.productId ?? "");
      if (!existing) {
        return NextResponse.json(
          { error: "Không tìm thấy thành phẩm nguồn." },
          { status: 404 },
        );
      }
      product = existing as unknown as Product;
      if (product.itemType !== "finished_good") {
        return NextResponse.json(
          { error: "Mặt hàng được chọn không phải thành phẩm." },
          { status: 400 },
        );
      }
    } else {
      const preferredSku = input.product.sku || createNextProductSku(products, {
        itemType: "finished_good",
        name: input.product.name,
      });
      const candidate = ensureProductIdentifiers({
        name: input.product.name,
        displayName: input.product.name,
        itemType: "finished_good" as const,
        catalogScope: "wholesale" as const,
        lifecycleStatus: input.offer.isAvailable ? "active" as const : "draft" as const,
        sku: preferredSku,
        barcode: input.product.barcode ?? "",
        baseUnit: input.product.baseUnit,
        categoryId: input.product.categoryId ?? "",
        imageUrl: input.product.imageUrl ?? "",
        shelfLife: input.product.shelfLife ?? "",
        storage: input.product.storage ?? "",
        price: 0,
        stock: 0,
        isAvailable: false,
        availableForDelivery: false,
        availableForPickup: false,
        sizeOptions: [],
        flavorOptions: [],
        variantCombinations: [],
      });
      const identifierError = getIdentifierValidationError(products, candidate);
      if (identifierError) {
        return NextResponse.json({ error: identifierError }, { status: 409 });
      }
      const created = await createWholesaleProduct(candidate);
      if (!created) throw new Error("PRODUCT_CREATE_FAILED");
      product = created as unknown as Product;
      createdProductId = product.id;
    }

    const database = getAdminFirestore();
    const existingOffers = await database.collection(OFFERS).get();
    const duplicate = existingOffers.docs.some((item) => {
      const data = item.data();
      const skuMatches = input.offer.sellUnitSku &&
        String(data.sellUnitSku ?? "").toUpperCase() === input.offer.sellUnitSku.toUpperCase();
      const barcodeMatches = input.offer.sellUnitBarcode &&
        String(data.sellUnitBarcode ?? "") === input.offer.sellUnitBarcode;
      const labelMatches = String(data.sellUnitLabel ?? "").toLocaleLowerCase("vi") ===
        input.offer.sellUnitLabel.toLocaleLowerCase("vi") &&
        String(data.productId ?? "") === product.id;
      return skuMatches || barcodeMatches || labelMatches;
    });
    if (duplicate) {
      if (createdProductId) {
        await deleteWholesaleRecord("products", createdProductId);
        createdProductId = null;
      }
      return NextResponse.json(
        { error: "Thành phẩm đã có quy cách bán sỉ này." },
        { status: 409 },
      );
    }

    const balances = await database.collection(BALANCES)
      .where("itemType", "==", "product")
      .where("itemId", "==", product.id)
      .get();
    const baseQuantity = balances.docs
      .filter((item) =>
        !input.offer.locationId ||
        String(item.data().locationId ?? "") === input.offer.locationId)
      .reduce((sum, item) => sum + Number(item.data().quantity ?? 0), 0);
    const legacyQuantity = Number(product.stock ?? 0);
    const stock = Math.floor(
      Math.max(baseQuantity, balances.empty ? legacyQuantity : 0) /
      input.offer.unitsPerSellUnit,
    );

    let recipe = null;
    let cost = null;
    if (input.source === "new" && input.bom) {
      recipe = await addRecipeVersion({
        productId: product.id,
        effectiveFrom: new Date(),
        yieldQuantity: input.bom.yieldQuantity,
        ingredients: input.bom.ingredients,
        packagingCostPerBatch: input.bom.packagingCostPerBatch,
        directLaborCostPerBatch: input.bom.directLaborCostPerBatch,
        overheadCostPerBatch: input.bom.overheadCostPerBatch,
        wasteBasisPoints: input.bom.wasteBasisPoints,
        ...(input.bom.packagingCostLines
          ? { packagingCostLines: input.bom.packagingCostLines }
          : {}),
        ...(input.bom.directLaborCostLines
          ? { directLaborCostLines: input.bom.directLaborCostLines }
          : {}),
        ...(input.bom.wasteCalculation
          ? { wasteCalculation: input.bom.wasteCalculation }
          : {}),
      }, getAdminSession(request)?.id ?? "admin");
      createdRecipeId = recipe.id;
      await activateRecipe(recipe.id, getAdminSession(request)?.id ?? "admin");
      const summaries = await buildProductCostSummaries([product]);
      cost = summaries[product.id] ?? null;
    }

    const reference = database.collection(OFFERS).doc();
    await reference.create({
      productId: product.id,
      productName: product.name,
      wholesalePrice: input.offer.wholesalePrice,
      minimumOrderQuantity: input.offer.minimumOrderQuantity,
      orderIncrement: input.offer.orderIncrement,
      sellUnitLabel: input.offer.sellUnitLabel,
      unitsPerSellUnit: input.offer.unitsPerSellUnit,
      sellUnitSku: input.offer.sellUnitSku ?? product.sku ?? null,
      sellUnitBarcode: input.offer.sellUnitBarcode ?? null,
      locationId: input.offer.locationId,
      leadTimeHours: input.offer.leadTimeHours,
      priceBreaks: input.offer.priceBreaks,
      tierDiscounts: input.offer.tierDiscounts ?? {},
      eligibleDealerTypes: input.offer.eligibleDealerTypes,
      eligibleDealerTiers: input.offer.eligibleDealerTiers,
      deliveryAreas: input.offer.deliveryAreas,
      stock,
      isAvailable: input.offer.isAvailable,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    createdOfferId = reference.id;

    const createdOffer = await reference.get();
    return NextResponse.json({
      product,
      offer: { id: createdOffer.id, ...createdOffer.data() },
      recipe: recipe ? { ...recipe, status: "active" } : null,
      cost,
    }, { status: 201 });
  } catch (error) {
    const database = getAdminFirestore();
    if (createdOfferId) {
      await database.collection(OFFERS).doc(createdOfferId).delete().catch((rollbackError) => {
        console.error("Failed to rollback wholesale offer:", rollbackError);
      });
    }
    if (createdRecipeId) {
      await database.collection("finance_recipe_versions").doc(createdRecipeId)
        .delete()
        .catch((rollbackError) => {
          console.error("Failed to rollback wholesale recipe:", rollbackError);
        });
    }
    if (createdProductId) {
      await deleteWholesaleRecord("products", createdProductId).catch((rollbackError) => {
        console.error("Failed to rollback wholesale product:", rollbackError);
      });
    }
    console.error("Failed to create wholesale offer:", error);
    if ((error as Error).message === "PRODUCT_IDENTIFIER_EXISTS") {
      return NextResponse.json(
        { error: "SKU hoặc barcode đã được sử dụng." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Không thể tạo thành phẩm bán sỉ." },
      { status: 500 },
    );
  }
}
