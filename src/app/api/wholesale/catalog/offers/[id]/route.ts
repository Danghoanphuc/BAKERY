import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getWholesaleRecord,
  updateWholesaleRecord,
} from "@/lib/wholesale-admin-store";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { Product, WholesaleProduct } from "@/types";

type OfferPatch = {
  wholesalePrice?: unknown;
  sellUnitLabel?: unknown;
  unitsPerSellUnit?: unknown;
  isAvailable?: unknown;
};

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const [currentRecord, patch] = await Promise.all([
      getWholesaleRecord("wholesale_products", id),
      request.json() as Promise<OfferPatch>,
    ]);
    if (!currentRecord) {
      return NextResponse.json(
        { error: "Không tìm thấy quy cách bán sỉ." },
        { status: 404 },
      );
    }

    const current = currentRecord as unknown as WholesaleProduct;
    const wholesalePrice = positiveInteger(patch.wholesalePrice);
    const sellUnitLabel = typeof patch.sellUnitLabel === "string"
      ? patch.sellUnitLabel.trim()
      : "";
    const unitsPerSellUnit = positiveInteger(patch.unitsPerSellUnit);
    const isAvailable = patch.isAvailable === true;
    if (!sellUnitLabel || unitsPerSellUnit <= 0 ||
        (isAvailable && wholesalePrice <= 0)) {
      return NextResponse.json(
        { error: "Giá sỉ và quy cách đóng gói chưa hợp lệ." },
        { status: 400 },
      );
    }

    const productRecord = await getWholesaleRecord("products", current.productId);
    if (!productRecord) {
      return NextResponse.json(
        { error: "Không tìm thấy thành phẩm nguồn." },
        { status: 404 },
      );
    }
    const product = productRecord as unknown as Product;
    const database = getAdminFirestore();
    const balances = await database.collection("inventory_balances")
      .where("itemType", "==", "product")
      .where("itemId", "==", current.productId)
      .get();
    const locationId = current.locationId ?? "main";
    const ledgerQuantity = balances.docs
      .filter((item) => String(item.data().locationId ?? "") === locationId)
      .reduce((sum, item) => sum + Number(item.data().quantity ?? 0), 0);
    const baseQuantity = balances.empty
      ? Number(product.stock ?? 0)
      : ledgerQuantity;

    const updated = await updateWholesaleRecord("wholesale_products", id, {
      productName: product.name,
      wholesalePrice,
      sellUnitLabel,
      unitsPerSellUnit,
      sellUnitSku: current.sellUnitSku ?? product.sku ?? null,
      stock: Math.floor(Math.max(0, baseQuantity) / unitsPerSellUnit),
      isAvailable,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update wholesale offer:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thành phẩm bán sỉ." },
      { status: 500 },
    );
  }
}
