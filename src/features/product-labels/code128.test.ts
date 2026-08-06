import { describe, expect, it } from "vitest";
import {
  buildProductLabelPrintDocument,
  encodeCode128B,
  encodeProductBarcode,
  isValidEan13,
  isValidGtin,
  productLabelBarcodeFitError,
  productLabelLayoutPreset,
} from "./code128";

describe("Code 128 product labels", () => {
  it("encodes Code 128-B with the correct start, checksum and stop codes", () => {
    const encoding = encodeCode128B("A");

    expect(encoding.codes).toEqual([104, 33, 34, 106]);
    expect(encoding.bars.length).toBeGreaterThan(10);
    expect(encoding.width).toBeGreaterThan(40);
  });

  it("uses compact EAN-13 encoding for a valid 13-digit product barcode", () => {
    expect(isValidEan13("2074315010342")).toBe(true);
    expect(isValidEan13("2074315010343")).toBe(false);

    const encoding = encodeProductBarcode("2074315010342");

    expect(encoding.symbology).toBe("EAN-13");
    expect(encoding.width).toBe(113);
    expect(encoding.bars.length).toBeGreaterThan(20);
  });

  it("keeps Code 128 for SKU and non-EAN identifiers", () => {
    const encoding = encodeProductBarcode("TP-BAOXANH-01");

    expect(encoding.symbology).toBe("Code 128");
    expect(encoding.width).toBeGreaterThan(113);
  });

  it("creates one print page per requested label with the selected paper size", () => {
    const document = buildProductLabelPrintDocument(
      [
        {
          name: "Bánh mì ngọt",
          sku: "TP-BANHMI-01",
          barcode: "2001234567893",
          quantity: 2,
        },
        {
          name: "Bánh dài",
          sku: "TP-BANHDAI-01",
          quantity: 1,
        },
      ],
      "50x30",
    );

    expect(document).toContain("@page { size: 50mm 30mm");
    expect(document.match(/<article class="label">/g)).toHaveLength(3);
    expect(document).toContain("2001234567893");
    expect(document).toContain('data-symbology="EAN-13"');
    expect(document).toContain('shape-rendering="crispEdges"');
    expect(document).toContain("TP-BANHDAI-01");
    expect(document).toContain("height: 5mm");
    expect(document).not.toContain("sweetime-wordmark.svg");
  });

  it("escapes product content before writing the print document", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "<Bánh & bơ>", sku: "TP-BO-01", quantity: 1 }],
      "40x30",
    );

    expect(document).toContain("&lt;Bánh &amp; bơ&gt;");
    expect(document).not.toContain("<Bánh & bơ>");
  });

  it("pairs every 35 × 22 mm product label with the bakery logo", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "Bánh mì", sku: "TP-BANHMI-01", quantity: 3 }],
      "35x22-double",
    );

    expect(document).toContain("@page { size: 70mm 22mm");
    expect(document.match(/<section class="sheet sheet-double">/g)).toHaveLength(3);
    expect(document.match(/<article class="label">/g)).toHaveLength(3);
    expect(document.match(/<aside class="logo-label"/g)).toHaveLength(3);
    expect(document.match(/sweetime-wordmark\.svg/g)).toHaveLength(3);
    expect(document).toContain("height: 3.5mm");
  });

  it("creates exactly one double-label sheet for a quantity of one", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "Bánh bao xanh", sku: "TP-BAOXANH-01", quantity: 1 }],
      "35x22-double",
    );

    expect(document.match(/<section class="sheet sheet-double">/g)).toHaveLength(1);
    expect(document.match(/<article class="label">/g)).toHaveLength(1);
    expect(document.match(/<aside class="logo-label"/g)).toHaveLength(1);
    expect(document).not.toContain("break-after: page");
    expect(document).not.toContain("page-break-after: always");
  });

  it("renders a compact scan-safe EAN-13 treatment on double labels", () => {
    const document = buildProductLabelPrintDocument(
      [{
        name: "Bánh bao xanh",
        barcode: "2074315010342",
        quantity: 1,
      }],
      "35x22-double",
    );

    expect(document).toContain('class="barcode-block barcode-retail"');
    expect(document).toContain("width: 29.8mm");
    expect(document).toContain("height: 5mm");
    expect(document).toContain("padding-bottom: 1.8mm");
    expect(document).toContain("font-size: 1.4mm");
    expect(document).toContain('data-symbology="EAN-13"');
  });

  it("uses a smaller two-line name treatment for long names on double labels", () => {
    const layout = productLabelLayoutPreset("35x22-double", "compact");
    const document = buildProductLabelPrintDocument(
      [{
        name: "Bánh mì ngọt nhân kem phô mai",
        sku: "TP-BANHMI-KEM-01",
        quantity: 1,
      }],
      "35x22-double",
    );

    expect(layout.nameSize).toBe("small");
    expect(layout.nameLines).toBe(2);
    expect(document).toContain('<article class="label label-long-name">');
    expect(document).toContain(".sheet-double .label-long-name header strong");
    expect(document).toContain("-webkit-line-clamp: 2");
    expect(document).toContain("overflow-wrap: anywhere");
  });

  it("renders optional business fields and printer calibration", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "Bánh mì ngọt", sku: "TP-BANHMI-01", price: 25_000, quantity: 1 }],
      "35x22-double",
      {
        layout: {
          showPrice: true,
          showProductionDate: true,
          showExpiryDate: true,
          showBatchCode: true,
          alignment: "center",
          nameLines: 2,
          columnGapMm: 1,
          offsetXmm: 0.5,
          offsetYmm: -0.5,
        },
        productionDate: "2026-08-02",
        expiryDate: "2026-08-05",
        batchCode: "M-0208",
      },
    );

    expect(document).toContain("25.000 ₫");
    expect(document).toContain("NSX 02/08/2026");
    expect(document).toContain("HSD 05/08/2026");
    expect(document).toContain("Lô M-0208");
    expect(document).toContain("<span>NSX 02/08/2026</span>");
    expect(document).toContain("<span>HSD 05/08/2026</span>");
    expect(document).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(document).toContain("@page { size: 71mm 22mm");
    expect(document).toContain("column-gap: 1mm");
    expect(document).toContain("transform: translate(0.5mm, -0.5mm)");
    expect(document).toContain("text-align: center");
  });

  it("can hide the barcode and SKU without losing the printable label", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "Bánh dài", sku: "TP-BANHDAI-01", quantity: 1 }],
      "40x30",
      { layout: { showBarcode: false, showSku: false } },
    );

    expect(document.match(/<article class="label">/g)).toHaveLength(1);
    expect(document).not.toContain('<svg class="barcode"');
    expect(document).not.toContain("SKU TP-BANHDAI-01");
  });

  it("does not encode an unsupported payload when barcode output is hidden", () => {
    expect(() => buildProductLabelPrintDocument(
      [{ name: "Bánh dài", sku: "MÃ NỘI BỘ", quantity: 1 }],
      "40x30",
      { layout: { showBarcode: false } },
    )).not.toThrow();
  });

  it("keeps supported GTIN formats in their retail symbologies", () => {
    expect(isValidGtin("96385074")).toBe(true);
    expect(encodeProductBarcode("96385074").symbology).toBe("EAN-8");

    expect(isValidGtin("036000291452")).toBe(true);
    expect(encodeProductBarcode("036000291452").symbology).toBe("UPC-A");

    expect(isValidGtin("10012345678902")).toBe(true);
    expect(encodeProductBarcode("10012345678902").symbology).toBe("ITF-14");
  });

  it("rejects a Code 128 payload that is too dense for a small label", () => {
    expect(
      productLabelBarcodeFitError(
        "TP-SANPHAM-BAN-SI-RAT-DAI-01",
        "35x22-double",
      ),
    ).toMatch(/quá dài/);
    expect(productLabelBarcodeFitError("2074315010342", "35x22-double")).toBe("");
  });

  it("can place two product labels on a double-label sheet", () => {
    const document = buildProductLabelPrintDocument(
      [{ name: "Bánh bao xanh", barcode: "2074315010342", quantity: 3 }],
      "35x22-double",
      { layout: { doubleMode: "product-product" } },
    );

    expect(document.match(/<section class="sheet sheet-double">/g)).toHaveLength(2);
    expect(document.match(/<article class="label">/g)).toHaveLength(3);
    expect(document).not.toContain('class="logo-label"');
    expect(document).toContain('class="blank-label"');
    expect(document).toContain("break-after: page");
  });
});
