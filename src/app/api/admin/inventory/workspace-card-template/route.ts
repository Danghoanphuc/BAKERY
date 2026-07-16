import { NextResponse } from "next/server";
import { getAllProducts, updateProduct } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { findWorkspaceCardTemplate, mergeWorkspaceCardTemplate } from "@/lib/workspace-card-template";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const products = await getAllProducts();
  const template = findWorkspaceCardTemplate(products);
  if (!template) return NextResponse.json({ error: "Chưa có sản phẩm nào có đủ ảnh minh hoạ cho 5 thẻ." }, { status: 422 });

  let updated = 0;
  await Promise.all(products.map(async (product) => {
    const workspaceCards = mergeWorkspaceCardTemplate(product.workspaceCards, template);
    const changed = JSON.stringify(workspaceCards) !== JSON.stringify(product.workspaceCards ?? {});
    if (!changed) return;
    await updateProduct(product.id, { workspaceCards });
    updated += 1;
  }));
  return NextResponse.json({ updated });
}
