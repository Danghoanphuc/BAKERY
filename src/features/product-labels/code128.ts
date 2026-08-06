export type Code128Bar = {
  x: number;
  width: number;
};

export type Code128Encoding = {
  bars: Code128Bar[];
  codes: number[];
  width: number;
};

export type ProductBarcodeEncoding = {
  bars: Code128Bar[];
  width: number;
  symbology: "EAN-8" | "UPC-A" | "EAN-13" | "ITF-14" | "Code 128";
};

export const PRODUCT_LABEL_LOGO_PATH = "/brand/sweetime-wordmark.svg";

export type ProductLabelSize = "50x30" | "40x30" | "35x22-double";

export type ProductLabelPrintJob = {
  name: string;
  sku?: string;
  barcode?: string;
  variantLabel?: string;
  price?: number;
  quantity: number;
};

export type ProductLabelPreset = "compact" | "full";
export type ProductLabelAlignment = "left" | "center";
export type ProductLabelNameSize = "small" | "medium" | "large";
export type ProductLabelBarcodeHeight = "low" | "medium" | "high";
export type ProductLabelDoubleMode = "logo-product" | "product-product";

export type ProductLabelLogo = {
  src: string;
  alt: string;
};

export type ProductLabelLayout = {
  showName: boolean;
  showVariant: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showProductionDate: boolean;
  showExpiryDate: boolean;
  showBatchCode: boolean;
  alignment: ProductLabelAlignment;
  nameSize: ProductLabelNameSize;
  nameLines: 1 | 2;
  barcodeHeight: ProductLabelBarcodeHeight;
  paddingMm: number;
  columnGapMm: number;
  offsetXmm: number;
  offsetYmm: number;
  doubleMode: ProductLabelDoubleMode;
};

export type ProductLabelDocumentOptions = {
  layout?: Partial<ProductLabelLayout>;
  productionDate?: string;
  expiryDate?: string;
  batchCode?: string;
  logo?: ProductLabelLogo;
};

const COMPACT_LAYOUT: Omit<ProductLabelLayout, "paddingMm"> = {
  showName: true,
  showVariant: true,
  showSku: true,
  showBarcode: true,
  showPrice: false,
  showProductionDate: false,
  showExpiryDate: false,
  showBatchCode: false,
  alignment: "left",
  nameSize: "medium",
  nameLines: 1,
  barcodeHeight: "low",
  columnGapMm: 0,
  offsetXmm: 0,
  offsetYmm: 0,
  doubleMode: "logo-product",
};

const FULL_LAYOUT: Omit<ProductLabelLayout, "paddingMm"> = {
  ...COMPACT_LAYOUT,
  showPrice: true,
  showProductionDate: true,
  showExpiryDate: true,
  showBatchCode: true,
  nameLines: 2,
  barcodeHeight: "low",
};

export function productLabelLayoutPreset(
  size: ProductLabelSize,
  preset: ProductLabelPreset,
): ProductLabelLayout {
  const baseLayout = preset === "full" ? FULL_LAYOUT : COMPACT_LAYOUT;
  return {
    ...baseLayout,
    nameSize: size === "35x22-double" ? "small" : baseLayout.nameSize,
    nameLines: size === "35x22-double" ? 2 : baseLayout.nameLines,
    paddingMm: size === "35x22-double" ? 1.2 : 2,
  };
}

export function normalizeProductLabelLayout(
  size: ProductLabelSize,
  value?: Partial<ProductLabelLayout>,
): ProductLabelLayout {
  const fallback = productLabelLayoutPreset(size, "compact");
  const source = { ...fallback, ...value };
  return {
    showName: Boolean(source.showName),
    showVariant: Boolean(source.showVariant),
    showSku: Boolean(source.showSku),
    showBarcode: Boolean(source.showBarcode),
    showPrice: Boolean(source.showPrice),
    showProductionDate: Boolean(source.showProductionDate),
    showExpiryDate: Boolean(source.showExpiryDate),
    showBatchCode: Boolean(source.showBatchCode),
    alignment: source.alignment === "center" ? "center" : "left",
    nameSize: ["small", "medium", "large"].includes(source.nameSize)
      ? source.nameSize
      : fallback.nameSize,
    nameLines: source.nameLines === 2 ? 2 : 1,
    barcodeHeight: ["low", "medium", "high"].includes(source.barcodeHeight)
      ? source.barcodeHeight
      : fallback.barcodeHeight,
    paddingMm: clampNumber(source.paddingMm, 0.5, 3, fallback.paddingMm),
    columnGapMm: clampNumber(source.columnGapMm, 0, 4, 0),
    offsetXmm: clampNumber(source.offsetXmm, -5, 5, 0),
    offsetYmm: clampNumber(source.offsetYmm, -5, 5, 0),
    doubleMode: source.doubleMode === "product-product"
      ? "product-product"
      : "logo-product",
  };
}

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222",
  "122213", "122312", "132212", "221213", "221312", "231212",
  "112232", "122132", "122231", "113222", "123122", "123221",
  "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321",
  "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131",
  "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124",
  "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111",
  "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141",
  "411131", "211412", "211214", "211232", "2331112",
] as const;

const START_CODE_B = 104;
const STOP_CODE = 106;
const QUIET_ZONE_MODULES = 10;
const EAN13_LEFT_QUIET_ZONE_MODULES = 11;
const EAN13_RIGHT_QUIET_ZONE_MODULES = 7;
const EAN13_LEFT_PATTERNS = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
] as const;
const EAN13_G_PATTERNS = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
] as const;
const EAN13_RIGHT_PATTERNS = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
] as const;
const EAN13_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
] as const;
const ITF_DIGIT_PATTERNS = [
  "nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw",
  "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn",
] as const;
const MIN_PRINTABLE_MODULE_MM = 0.2;

export function productLabelPayload(job: Pick<ProductLabelPrintJob, "barcode" | "sku">) {
  return job.barcode?.trim() || job.sku?.trim() || "";
}

export function productLabelNameNeedsCompactFit(name: string) {
  return [...name.trim()].length > 16;
}

export function encodeCode128B(rawValue: string): Code128Encoding {
  const value = rawValue.trim();
  if (!value) throw new Error("BARCODE_VALUE_REQUIRED");
  if ([...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code > 126;
  })) {
    throw new Error("BARCODE_VALUE_UNSUPPORTED");
  }

  const dataCodes = [...value].map((character) => character.charCodeAt(0) - 32);
  const checksum = (
    START_CODE_B +
    dataCodes.reduce((sum, code, index) => sum + code * (index + 1), 0)
  ) % 103;
  const codes = [START_CODE_B, ...dataCodes, checksum, STOP_CODE];
  const bars: Code128Bar[] = [];
  let cursor = QUIET_ZONE_MODULES;

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) throw new Error("BARCODE_PATTERN_MISSING");
    for (let index = 0; index < pattern.length; index += 1) {
      const width = Number(pattern[index]);
      if (index % 2 === 0) bars.push({ x: cursor, width });
      cursor += width;
    }
  }

  return {
    bars,
    codes,
    width: cursor + QUIET_ZONE_MODULES,
  };
}

export function isValidEan13(rawValue: string) {
  const value = rawValue.trim();
  if (!/^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

export function isValidGtin(rawValue: string) {
  const value = rawValue.trim();
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return checkDigit === (10 - (sum % 10)) % 10;
}

export function encodeEan13(rawValue: string): ProductBarcodeEncoding {
  const value = rawValue.trim();
  if (!isValidEan13(value)) throw new Error("EAN13_VALUE_INVALID");
  const firstDigit = Number(value[0]);
  const parity = EAN13_PARITY[firstDigit];
  const left = [...value.slice(1, 7)]
    .map((digit, index) => {
      const digitIndex = Number(digit);
      return parity[index] === "G"
        ? EAN13_G_PATTERNS[digitIndex]
        : EAN13_LEFT_PATTERNS[digitIndex];
    })
    .join("");
  const right = [...value.slice(7)]
    .map((digit) => EAN13_RIGHT_PATTERNS[Number(digit)])
    .join("");
  const modules = `${"0".repeat(EAN13_LEFT_QUIET_ZONE_MODULES)}101${left}01010${right}101${"0".repeat(EAN13_RIGHT_QUIET_ZONE_MODULES)}`;

  return {
    bars: barsFromBinaryModules(modules),
    width: modules.length,
    symbology: "EAN-13",
  };
}

export function encodeEan8(rawValue: string): ProductBarcodeEncoding {
  const value = rawValue.trim();
  if (!isValidGtin(value) || value.length !== 8) throw new Error("EAN8_VALUE_INVALID");
  const left = [...value.slice(0, 4)]
    .map((digit) => EAN13_LEFT_PATTERNS[Number(digit)])
    .join("");
  const right = [...value.slice(4)]
    .map((digit) => EAN13_RIGHT_PATTERNS[Number(digit)])
    .join("");
  const modules = `${"0".repeat(7)}101${left}01010${right}101${"0".repeat(7)}`;
  return {
    bars: barsFromBinaryModules(modules),
    width: modules.length,
    symbology: "EAN-8",
  };
}

export function encodeUpcA(rawValue: string): ProductBarcodeEncoding {
  const value = rawValue.trim();
  if (!isValidGtin(value) || value.length !== 12) throw new Error("UPCA_VALUE_INVALID");
  const encoding = encodeEan13(`0${value}`);
  return { ...encoding, symbology: "UPC-A" };
}

export function encodeItf14(rawValue: string): ProductBarcodeEncoding {
  const value = rawValue.trim();
  if (!isValidGtin(value) || value.length !== 14) throw new Error("ITF14_VALUE_INVALID");
  const bars: Code128Bar[] = [];
  const narrow = 1;
  const wide = 3;
  const quietZone = 10;
  let cursor = quietZone;
  const append = (width: number, isBar: boolean) => {
    if (isBar) bars.push({ x: cursor, width });
    cursor += width;
  };

  for (const [width, isBar] of [[narrow, true], [narrow, false], [narrow, true], [narrow, false]] as const) {
    append(width, isBar);
  }
  for (let index = 0; index < value.length; index += 2) {
    const barsPattern = ITF_DIGIT_PATTERNS[Number(value[index])];
    const spacesPattern = ITF_DIGIT_PATTERNS[Number(value[index + 1])];
    for (let moduleIndex = 0; moduleIndex < 5; moduleIndex += 1) {
      append(barsPattern[moduleIndex] === "w" ? wide : narrow, true);
      append(spacesPattern[moduleIndex] === "w" ? wide : narrow, false);
    }
  }
  append(wide, true);
  append(narrow, false);
  append(narrow, true);
  return {
    bars,
    width: cursor + quietZone,
    symbology: "ITF-14",
  };
}

export function encodeProductBarcode(rawValue: string): ProductBarcodeEncoding {
  const value = rawValue.trim();
  if (isValidGtin(value)) {
    if (value.length === 8) return encodeEan8(value);
    if (value.length === 12) return encodeUpcA(value);
    if (value.length === 13) return encodeEan13(value);
    return encodeItf14(value);
  }
  const encoding = encodeCode128B(value);
  return {
    bars: encoding.bars,
    width: encoding.width,
    symbology: "Code 128",
  };
}

export function productLabelBarcodeFitError(
  value: string,
  size: ProductLabelSize,
  layoutValue?: Partial<ProductLabelLayout>,
) {
  try {
    const layout = normalizeProductLabelLayout(size, layoutValue);
    const encoding = encodeProductBarcode(value);
    const labelWidthMm = size === "35x22-double" ? 35 : Number(size.split("x")[0]);
    const availableWidthMm = encoding.symbology === "EAN-13" && size === "35x22-double"
      ? 29.8
      : Math.max(1, labelWidthMm - layout.paddingMm * 2);
    const moduleWidthMm = availableWidthMm / encoding.width;
    return moduleWidthMm < MIN_PRINTABLE_MODULE_MM
      ? `Mã “${value}” quá dài cho khổ tem đã chọn. Hãy dùng barcode GTIN hoặc khổ tem lớn hơn.`
      : "";
  } catch {
    return `Mã “${value}” chứa ký tự không được Code 128 hỗ trợ.`;
  }
}

export function barcodeSvgMarkup(value: string) {
  const encoding = encodeProductBarcode(value);
  const rects = encoding.bars
    .map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="44"/>`)
    .join("");
  return `<svg class="barcode" data-symbology="${encoding.symbology}" viewBox="0 0 ${encoding.width} 44" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${encoding.symbology} ${escapeHtml(value)}">${rects}</svg>`;
}

export function buildProductLabelPrintDocument(
  jobs: ProductLabelPrintJob[],
  size: ProductLabelSize,
  options: ProductLabelDocumentOptions = {},
) {
  const isDouble = size === "35x22-double";
  const layout = normalizeProductLabelLayout(size, options.layout);
  const labelWidth = isDouble ? 35 : Number(size.split("x")[0]);
  const labelHeight = isDouble ? 22 : Number(size.split("x")[1]);
  const pageWidth = isDouble
    ? labelWidth * 2 + layout.columnGapMm
    : labelWidth;
  const pageHeight = labelHeight;
  const bottomPaddingMm = isDouble ? Math.max(layout.paddingMm, 1.8) : layout.paddingMm;
  const nameSizeMm = nameSizeForPrint(layout.nameSize, isDouble);
  const barcodeHeightMm = barcodeHeightForPrint(layout.barcodeHeight, isDouble);
  const labels = jobs.flatMap((job) => {
    const payload = productLabelPayload(job);
    if (!payload || job.quantity <= 0) return [];
    const barcodeSymbology = layout.showBarcode
      ? encodeProductBarcode(payload).symbology
      : null;
    const metadata = [
      layout.showProductionDate && options.productionDate
        ? `NSX ${formatProductLabelDate(options.productionDate)}`
        : "",
      layout.showExpiryDate && options.expiryDate
        ? `HSD ${formatProductLabelDate(options.expiryDate)}`
        : "",
      layout.showBatchCode && options.batchCode?.trim()
        ? `Lô ${options.batchCode.trim()}`
        : "",
    ].filter(Boolean);
    const compactLongName = isDouble && productLabelNameNeedsCompactFit(job.name);
    const label = `
      <article class="label${compactLongName ? " label-long-name" : ""}">
        ${layout.showName || (layout.showVariant && job.variantLabel) ? `<header>
          ${layout.showName ? `<strong>${escapeHtml(job.name)}</strong>` : ""}
          ${layout.showVariant && job.variantLabel ? `<span>${escapeHtml(job.variantLabel)}</span>` : ""}
        </header>` : ""}
        ${layout.showPrice && typeof job.price === "number" && Number.isFinite(job.price) && job.price > 0 ? `<div class="price">${formatProductLabelPrice(job.price)}</div>` : ""}
         ${layout.showBarcode ? `<div class="barcode-block${["EAN-8", "UPC-A", "EAN-13"].includes(barcodeSymbology) ? " barcode-retail" : ""}">
          ${barcodeSvgMarkup(payload)}
          <div class="barcode-value">${escapeHtml(payload)}</div>
        </div>` : ""}
        ${metadata.length ? `<div class="metadata">${metadata.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        ${layout.showSku ? `<footer>SKU ${escapeHtml(job.sku?.trim() || "—")}</footer>` : ""}
      </article>`;
    return Array.from({ length: Math.floor(job.quantity) }, () => label);
  });
  const logo = options.logo ?? { src: PRODUCT_LABEL_LOGO_PATH, alt: "SweetTime" };
  const logoLabel = `<aside class="logo-label" aria-label="${escapeHtml(logo.alt)}">
      <img src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt)}"/>
    </aside>`;
  const sheets = isDouble
    ? layout.doubleMode === "product-product"
      ? chunk(labels, 2).map(
          ([firstLabel, secondLabel]) =>
            `<section class="sheet sheet-double">${firstLabel}${secondLabel ?? '<aside class="blank-label" aria-hidden="true"></aside>'}</section>`,
        )
      : labels.map(
          (label) => `<section class="sheet sheet-double">${logoLabel}${label}</section>`,
        )
    : labels.map((label) => `<section class="sheet">${label}</section>`);
  const pageBreakStyles = sheets.length > 1
    ? ".sheet:not(:last-child) { break-after: page; page-break-after: always; }"
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Tem sản phẩm</title>
  <style>
    :root {
      --label-paper: oklch(99% 0.008 82);
      --label-ink: oklch(12% 0.01 48);
      --label-muted: oklch(38% 0.025 48);
      --label-font-body: Arial, sans-serif;
      --label-font-mono: ui-monospace, monospace;
    }
    @page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--label-paper); color: var(--label-ink); }
    body { font-family: var(--label-font-body); }
    .sheet {
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      background: var(--label-paper);
    }
    ${pageBreakStyles}
    .sheet-double {
      display: grid;
      grid-template-columns: repeat(2, ${labelWidth}mm);
      column-gap: ${layout.columnGapMm}mm;
    }
    .logo-label, .blank-label {
      width: ${labelWidth}mm;
      height: ${labelHeight}mm;
      display: grid;
      place-items: center;
      padding: 0.8mm;
      overflow: hidden;
      background: var(--label-paper);
      transform: translate(${layout.offsetXmm}mm, ${layout.offsetYmm}mm);
      transform-origin: top left;
    }
    .logo-label img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .label {
      width: ${labelWidth}mm;
      height: ${labelHeight}mm;
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: ${isDouble ? 0.35 : 0.7}mm;
      padding: ${layout.paddingMm}mm;
      padding-bottom: ${bottomPaddingMm}mm;
      overflow: hidden;
      background: var(--label-paper);
      text-align: ${layout.alignment};
      transform: translate(${layout.offsetXmm}mm, ${layout.offsetYmm}mm);
      transform-origin: top left;
    }
    header { min-width: 0; overflow: hidden; }
    header strong {
      display: block;
      overflow: hidden;
      font-size: ${nameSizeMm}mm;
      line-height: 1.05;
      text-overflow: ellipsis;
      ${layout.nameLines === 2
        ? "display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal;"
        : "white-space: nowrap;"}
    }
    .sheet-double .label-long-name header strong {
      display: -webkit-box;
      overflow-wrap: anywhere;
      font-size: 2.1mm;
      white-space: normal;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    header span {
      display: block;
      margin-top: 0.4mm;
      overflow: hidden;
      color: var(--label-muted);
      font-size: 2.2mm;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sheet-double header span { margin-top: 0.2mm; font-size: 1.8mm; }
    .price {
      font-size: ${isDouble ? 1.8 : 2.4}mm;
      font-weight: 800;
      line-height: 1;
    }
    .barcode-block { min-width: 0; margin-top: auto; }
    .barcode { width: 100%; height: ${barcodeHeightMm}mm; color: var(--label-ink); fill: currentColor; }
    .sheet-double .barcode-retail {
      width: 29.8mm;
      max-width: 100%;
      margin-right: auto;
      margin-left: auto;
    }
    .sheet-double .barcode-retail .barcode {
      display: block;
      width: 29.8mm;
      max-width: 100%;
      height: 5mm;
      margin-right: auto;
      margin-left: auto;
    }
    .barcode-value {
      overflow: hidden;
      font-family: var(--label-font-mono);
      font-size: 2.2mm;
      font-weight: 700;
      letter-spacing: 0.25mm;
      line-height: 1;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sheet-double .barcode-value { font-size: 1.65mm; letter-spacing: 0.12mm; }
    .sheet-double .barcode-retail .barcode-value {
      font-size: 1.4mm;
      letter-spacing: 0.08mm;
    }
    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3mm 0.7mm;
      overflow: hidden;
      color: var(--label-muted);
      font-size: ${isDouble ? 1.35 : 1.75}mm;
      font-weight: 700;
      line-height: 1;
    }
    .metadata span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sheet-double .metadata {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.25mm;
      width: 100%;
      font-size: 1.2mm;
      line-height: 1.15;
    }
    footer {
      overflow: hidden;
      color: var(--label-muted);
      font-size: 1.9mm;
      font-weight: 700;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sheet-double footer { font-size: 1.45mm; }
  </style>
</head>
<body>${sheets.join("")}</body>
</html>`;
}

function nameSizeForPrint(size: ProductLabelNameSize, compact: boolean) {
  const values = compact
    ? { small: 2.1, medium: 2.6, large: 3 }
    : { small: 2.7, medium: 3.2, large: 3.8 };
  return values[size];
}

function barcodeHeightForPrint(height: ProductLabelBarcodeHeight, compact: boolean) {
  const values = compact
    ? { low: 3.5, medium: 4.5, high: 6 }
    : { low: 5, medium: 7, high: 9 };
  return values[height];
}

function formatProductLabelDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value.trim();
}

function formatProductLabelPrice(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function barsFromBinaryModules(modules: string) {
  const bars: Code128Bar[] = [];
  let start = -1;
  for (let index = 0; index <= modules.length; index += 1) {
    if (modules[index] === "1" && start < 0) start = index;
    if (modules[index] !== "1" && start >= 0) {
      bars.push({ x: start, width: index - start });
      start = -1;
    }
  }
  return bars;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}
