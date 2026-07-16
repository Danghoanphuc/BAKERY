import type { Product, ProductItemType } from "@/types";

type IdentifierSource = Pick<Product, "id" | "sku" | "barcode" | "variantCombinations">;

const itemTypePrefixes: Record<ProductItemType, string> = {
  finished_good: "TP",
  ingredient: "NL",
  semi_finished: "BTP",
};

function randomToken(length = 4) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function toSkuSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 12) || fallback;
}

function ean13CheckDigit(value: string) {
  const sum = value.split("").reduce((total, digit, index) => (
    total + Number(digit) * (index % 2 === 0 ? 1 : 3)
  ), 0);
  return String((10 - (sum % 10)) % 10);
}

export function createInternalBarcode() {
  const payload = `20${Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("")}`;
  return `${payload}${ean13CheckDigit(payload)}`;
}

export function createProductSku(input: { itemType: ProductItemType; name: string }) {
  return `${itemTypePrefixes[input.itemType]}-${toSkuSegment(input.name, "SP")}-${randomToken()}`;
}

export function createVariantSku(input: { productSku: string; sizeLabel: string; flavorLabel: string }) {
  const root = toSkuSegment(input.productSku, "SP");
  return `${root}-${toSkuSegment(input.sizeLabel, "SIZE")}-${toSkuSegment(input.flavorLabel, "VI")}`;
}

function collectIdentifiers(product: IdentifierSource) {
  const identifiers: Array<{ type: "SKU" | "barcode"; value: string; label: string }> = [];
  if (product.sku?.trim()) identifiers.push({ type: "SKU", value: product.sku.trim().toUpperCase(), label: "SKU gốc" });
  if (product.barcode?.trim()) identifiers.push({ type: "barcode", value: product.barcode.trim(), label: "barcode gốc" });
  product.variantCombinations?.forEach((variant, index) => {
    if (variant.sku?.trim()) identifiers.push({ type: "SKU", value: variant.sku.trim().toUpperCase(), label: `SKU biến thể ${index + 1}` });
    if (variant.barcode?.trim()) identifiers.push({ type: "barcode", value: variant.barcode.trim(), label: `barcode biến thể ${index + 1}` });
  });
  return identifiers;
}

export function getIdentifierValidationError(
  products: IdentifierSource[],
  candidate: IdentifierSource,
  excludeProductId?: string,
) {
  const candidateIdentifiers = collectIdentifiers(candidate);
  const seen = new Set<string>();

  for (const identifier of candidateIdentifiers) {
    const key = `${identifier.type}:${identifier.value}`;
    if (seen.has(key)) return `${identifier.type} bị trùng trong chính sản phẩm này.`;
    seen.add(key);
  }

  const used = new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .flatMap(collectIdentifiers)
      .map((identifier) => `${identifier.type}:${identifier.value}`),
  );

  const duplicate = candidateIdentifiers.find((identifier) => used.has(`${identifier.type}:${identifier.value}`));
  return duplicate ? `${duplicate.label} “${duplicate.value}” đã được dùng bởi sản phẩm khác.` : null;
}
