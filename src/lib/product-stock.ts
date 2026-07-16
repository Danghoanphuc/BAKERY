import type { Product } from "@/types/product";

export type StockTarget =
  | { kind: "combination"; combinationId: string }
  | { kind: "size"; sizeId: string }
  | { kind: "flavor"; flavorId: string }
  | { kind: "product" };

/**
 * Prefer the most specific tracked stock: size/flavor combination > size > flavor > product.
 * Only one level is decremented / restored per sale line.
 */
export function resolveStockTarget(
  product: Product,
  sizeId?: string,
  flavorId?: string,
): StockTarget {
  if (sizeId && flavorId) {
    const combination = product.variantCombinations?.find(
      (item) => item.sizeOptionId === sizeId && item.flavorOptionId === flavorId,
    );
    if (combination && typeof combination.stock === "number") {
      return { kind: "combination", combinationId: combination.id };
    }
  }
  if (sizeId) {
    const size = product.sizeOptions?.find((option) => option.id === sizeId);
    if (size && typeof size.stock === "number") {
      return { kind: "size", sizeId };
    }
  }

  if (flavorId) {
    const flavor = product.flavorOptions?.find((option) => option.id === flavorId);
    if (flavor && typeof flavor.stock === "number") {
      return { kind: "flavor", flavorId };
    }
  }

  return { kind: "product" };
}

export function getEffectiveStock(
  product: Product,
  sizeId?: string,
  flavorId?: string,
): number | undefined {
  const target = resolveStockTarget(product, sizeId, flavorId);

  if (target.kind === "size") {
    return product.sizeOptions?.find((option) => option.id === target.sizeId)?.stock;
  }

  if (target.kind === "combination") {
    return product.variantCombinations?.find(
      (item) => item.id === target.combinationId,
    )?.stock;
  }

  if (target.kind === "flavor") {
    return product.flavorOptions?.find((option) => option.id === target.flavorId)?.stock;
  }

  return product.stock;
}

export function applyStockDelta(
  product: Product,
  quantity: number,
  sizeId?: string,
  flavorId?: string,
): Pick<Product, "sizeOptions" | "flavorOptions" | "variantCombinations" | "stock"> {
  const target = resolveStockTarget(product, sizeId, flavorId);
  let sizeOptions = product.sizeOptions;
  let flavorOptions = product.flavorOptions;
  let variantCombinations = product.variantCombinations;
  let stock = product.stock;

  if (target.kind === "combination" && variantCombinations) {
    variantCombinations = variantCombinations.map((item) =>
      item.id === target.combinationId && typeof item.stock === "number"
        ? { ...item, stock: item.stock + quantity }
        : item,
    );
  } else if (target.kind === "size" && sizeOptions) {
    sizeOptions = sizeOptions.map((option) =>
      option.id === target.sizeId && typeof option.stock === "number"
        ? { ...option, stock: option.stock + quantity }
        : option,
    );
  } else if (target.kind === "flavor" && flavorOptions) {
    flavorOptions = flavorOptions.map((option) =>
      option.id === target.flavorId && typeof option.stock === "number"
        ? { ...option, stock: option.stock + quantity }
        : option,
    );
  } else if (typeof stock === "number") {
    stock = stock + quantity;
  }

  return { sizeOptions, flavorOptions, variantCombinations, stock };
}
