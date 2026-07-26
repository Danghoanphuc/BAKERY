import type { Product, ProductItemType } from "@/types";

type IdentifierSource = Partial<
  Pick<
    Product,
    "id" | "name" | "itemType" | "sku" | "barcode" | "sizeOptions" | "flavorOptions" | "variantCombinations"
  >
>;

const itemTypePrefixes: Record<ProductItemType, string> = {
  finished_good: "TP",
  ingredient: "NL",
  semi_finished: "BTP",
};

function toSkuSegment(value: string, fallback: string, maxLength = 12) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, maxLength) || fallback;
}

function compactNameCode(value: string) {
  const parts = toSkuSegment(value, "SP", 48).split("-").filter(Boolean);
  if (parts[0] === "BANH") {
    parts.shift();
    if (String(parts[0]) === "MI") parts.shift();
  }
  if (parts.length === 0) return "SP";
  if (parts.length === 1) return parts[0].slice(0, 7);
  const joined = parts.join("");
  if (joined.length <= 7) return joined;
  const numericSuffix = parts.filter((part) => /^\d+$/.test(part)).join("");
  const firstPair = `${parts[0]}${parts[1]}${numericSuffix}`.slice(0, 7);
  if (firstPair.length <= 7) return firstPair;
  return parts[0].slice(0, 7);
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

function formatSkuSequence(sequence: number) {
  return Math.max(1, Math.floor(sequence)).toString().padStart(2, "0");
}

export function createProductSku(
  input: { itemType: ProductItemType; name: string },
  sequence = 1,
) {
  return `${itemTypePrefixes[input.itemType]}-${compactNameCode(input.name)}-${formatSkuSequence(sequence)}`;
}

export function createProductSkuPattern(input: { itemType: ProductItemType; name: string }) {
  return `${itemTypePrefixes[input.itemType]}-${compactNameCode(input.name)}-XX`;
}

export function createNextProductSku(
  products: IdentifierSource[],
  input: { itemType: ProductItemType; name: string },
) {
  const base = `${itemTypePrefixes[input.itemType]}-${compactNameCode(input.name)}-`;
  const maximum = products.reduce((currentMaximum, product) => {
    const sku = product.sku?.trim().toUpperCase() ?? "";
    if (!sku.startsWith(base)) return currentMaximum;
    const sequence = Number(sku.slice(base.length));
    return Number.isSafeInteger(sequence)
      ? Math.max(currentMaximum, sequence)
      : currentMaximum;
  }, 0);
  return createProductSku(input, maximum + 1);
}

function compactProductSku(productSku: string) {
  const normalized = toSkuSegment(productSku, "SP", 64);
  const parts = normalized.split("-").filter(Boolean);
  if (["TP", "NL", "BTP"].includes(parts[0])) parts.shift();
  while (["GEN", "SP", "PRODUCT", "SANPHAM"].includes(parts[0])) parts.shift();
  if (parts.length === 0) return "SP-01";
  if (parts.length === 1) return parts[0].slice(0, 12);
  const sequence = parts.pop()?.slice(-4) || "01";
  const productCode = parts.join("").slice(0, 7) || "SP";
  return `${productCode}-${sequence}`;
}

function compactVariantLabel(value: string, fallback: string) {
  const parts = toSkuSegment(value, fallback, 24).split("-").filter(Boolean);
  if (parts.length === 1) {
    const part = parts[0];
    return /\d/.test(part) ? part.slice(0, 5) : part.slice(0, 3);
  }
  return parts.map((part) => part[0]).join("").slice(0, 4);
}

export function createVariantSku(input: { productSku: string; sizeLabel: string; flavorLabel: string }) {
  const segments = [compactProductSku(input.productSku)];
  if (input.sizeLabel.trim()) segments.push(compactVariantLabel(input.sizeLabel, "S"));
  if (input.flavorLabel.trim()) segments.push(compactVariantLabel(input.flavorLabel, "V"));
  if (segments.length === 1) segments.push("V");
  return segments.join("-");
}

function collectIdentifiers(product: IdentifierSource) {
  const identifiers: Array<{ type: "SKU" | "barcode"; value: string; label: string }> = [];
  const add = (type: "SKU" | "barcode", value: string | undefined, label: string) => {
    const normalized = value?.trim().toUpperCase();
    if (normalized) identifiers.push({ type, value: normalized, label });
  };

  add("SKU", product.sku, "SKU gốc");
  add("barcode", product.barcode, "Barcode gốc");
  product.sizeOptions?.forEach((variant, index) => {
    add("SKU", variant.sku, `SKU size ${index + 1}`);
    add("barcode", variant.barcode, `Barcode size ${index + 1}`);
  });
  product.flavorOptions?.forEach((variant, index) => {
    add("SKU", variant.sku, `SKU vị/nhân ${index + 1}`);
    add("barcode", variant.barcode, `Barcode vị/nhân ${index + 1}`);
  });
  product.variantCombinations?.forEach((variant, index) => {
    add("SKU", variant.sku, `SKU tổ hợp ${index + 1}`);
    add("barcode", variant.barcode, `Barcode tổ hợp ${index + 1}`);
  });
  return identifiers;
}

export function getProductIdentifierValues(product: IdentifierSource) {
  return [...new Set(collectIdentifiers(product).map((identifier) => identifier.value))];
}

function isValidGtin(value: string) {
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return false;
  const digits = value.split("").map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return checkDigit === (10 - (sum % 10)) % 10;
}

export function normalizeProductIdentifiers<T extends IdentifierSource>(product: T): T {
  const normalizeSku = (value: string | undefined) => value?.trim().toUpperCase() ?? "";
  const normalizeBarcode = (value: string | undefined) => value?.trim() ?? "";
  return {
    ...product,
    sku: normalizeSku(product.sku),
    barcode: normalizeBarcode(product.barcode),
    sizeOptions: product.sizeOptions?.map((option) => ({
      ...option,
      sku: normalizeSku(option.sku),
      barcode: normalizeBarcode(option.barcode),
    })),
    flavorOptions: product.flavorOptions?.map((option) => ({
      ...option,
      sku: normalizeSku(option.sku),
      barcode: normalizeBarcode(option.barcode),
    })),
    variantCombinations: product.variantCombinations?.map((option) => ({
      ...option,
      sku: normalizeSku(option.sku),
      barcode: normalizeBarcode(option.barcode),
    })),
  } as T;
}

export function ensureProductIdentifiers<T extends IdentifierSource>(
  product: T,
  options: { replaceVariantSkus?: boolean } = {},
): T {
  const normalized = normalizeProductIdentifiers(product);
  const sku = normalized.sku || createProductSku({
    itemType: normalized.itemType ?? "finished_good",
    name: normalized.name ?? "",
  });
  const barcode = normalized.barcode || createInternalBarcode();
  const hasCombinations = Boolean(normalized.variantCombinations?.length);
  const sizeById = new Map(normalized.sizeOptions?.map((option) => [option.id, option]));
  const flavorById = new Map(normalized.flavorOptions?.map((option) => [option.id, option]));

  return {
    ...normalized,
    sku,
    barcode,
    sizeOptions: normalized.sizeOptions?.map((option) => hasCombinations ? option : ({
      ...option,
      sku: options.replaceVariantSkus || !option.sku ? createVariantSku({
        productSku: sku,
        sizeLabel: option.label,
        flavorLabel: "",
      }) : option.sku,
      barcode: option.barcode || createInternalBarcode(),
    })),
    flavorOptions: normalized.flavorOptions?.map((option) => hasCombinations ? option : ({
      ...option,
      sku: options.replaceVariantSkus || !option.sku ? createVariantSku({
        productSku: sku,
        sizeLabel: "",
        flavorLabel: option.label,
      }) : option.sku,
      barcode: option.barcode || createInternalBarcode(),
    })),
    variantCombinations: normalized.variantCombinations?.map((option) => {
      const size = sizeById.get(option.sizeOptionId);
      const flavor = flavorById.get(option.flavorOptionId);
      return {
        ...option,
        sku: options.replaceVariantSkus || !option.sku ? createVariantSku({
          productSku: sku,
          sizeLabel: size?.label ?? "",
          flavorLabel: flavor?.label ?? "",
        }) : option.sku,
        barcode: option.barcode || createInternalBarcode(),
      };
    }),
  } as T;
}

export function getIdentifierValidationError(
  products: IdentifierSource[],
  candidate: IdentifierSource,
  excludeProductId?: string,
) {
  const candidateIdentifiers = collectIdentifiers(candidate);
  const seen = new Set<string>();

  for (const identifier of candidateIdentifiers) {
    if (identifier.type === "SKU" && (
      identifier.value.length > 96 ||
      !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(identifier.value)
    )) {
      return `${identifier.label} không đúng định dạng SKU.`;
    }
    if (identifier.type === "barcode" && !isValidGtin(identifier.value)) {
      return `${identifier.label} không phải GTIN/EAN hợp lệ.`;
    }
    if (seen.has(identifier.value)) {
      return `Mã “${identifier.value}” bị trùng trong chính sản phẩm này.`;
    }
    seen.add(identifier.value);
  }

  const used = new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .flatMap(collectIdentifiers)
      .map((identifier) => identifier.value),
  );

  const duplicate = candidateIdentifiers.find((identifier) => used.has(identifier.value));
  return duplicate ? `${duplicate.label} “${duplicate.value}” đã được dùng bởi sản phẩm khác.` : null;
}
