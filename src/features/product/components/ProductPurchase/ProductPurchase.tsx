"use client";

import Link from "next/link";
import { forwardRef, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CakeSlice,
  ChevronDown,
  Clock3,
  Info,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { clsx } from "clsx";

import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductOffers } from "@/features/product/components/ProductOffers";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import {
  getProductPriceRange,
  getProductUnitPrice,
  isProductOptionAvailable,
  type ProductCustomization,
} from "@/features/product/product-cart";
import {
  getFulfillmentPromise,
  getProductOrderAvailability,
  getServingLabel,
  getSizePresentation,
  type SizePresentation,
} from "@/features/product/product-sales";
import type { ProductConfigurator } from "@/features/product/use-product-configurator";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export type ProductPurchaseSource = "sheet" | "page";

type ProductPurchaseContentProps = {
  product: Product;
  configurator: ProductConfigurator;
  deliveryMode: "delivery" | "pickup";
  address?: string;
  onChooseAddress: () => void;
  detailsHref?: string;
  onViewFullDetails?: () => void;
  fullPage?: boolean;
};

export function ProductPurchaseContent({
  product,
  configurator,
  deliveryMode,
  address,
  onChooseAddress,
  detailsHref,
  onViewFullDetails,
  fullPage = false,
}: ProductPurchaseContentProps) {
  const { customization } = configurator;
  const availability = getProductOrderAvailability(product, deliveryMode);
  const fulfillment = getFulfillmentPromise(product, deliveryMode);

  return (
    <div className={clsx(fullPage && "lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-8")}>
      <ProductGallery product={product} customization={customization} fullPage={fullPage} />

      <div className={clsx("px-4 pb-5 pt-4", fullPage && "lg:px-0 lg:py-0")}>
        <ProductSummary
          product={product}
          customization={customization}
          availability={availability}
        />

        <div className="space-y-5 py-5">
          <FulfillmentCard
            mode={deliveryMode}
            headline={
              deliveryMode === "delivery" && !address
                ? `Sẵn sàng sau khoảng ${product.preparationTimeMinutes ?? 30} phút`
                : fulfillment.headline
            }
            detail={
              deliveryMode === "delivery" && !address
                ? "Chọn địa chỉ để xem giờ giao và phí giao chính xác."
                : fulfillment.detail
            }
            address={address}
            onChooseAddress={onChooseAddress}
          />

          {product.sizeOptions?.length ? (
            <OptionGroup
              ref={configurator.sizeSectionRef}
              title="Chọn kích thước"
              error={configurator.errors.selectedSize}
            >
              <div className="grid grid-cols-2 gap-2">
                {product.sizeOptions.map((size) => {
                  const optionAvailable = isProductOptionAvailable(
                    product,
                    { sizeId: size.id },
                    customization,
                  );
                  return (
                    <VariantOption
                      key={size.id}
                      active={customization.selectedSize === size.id}
                      available={optionAvailable}
                      presentation={getSizePresentation(product, size)}
                      onClick={() => configurator.selectSize(size.id)}
                    />
                  );
                })}
              </div>
            </OptionGroup>
          ) : null}

          {product.flavorOptions?.length ? (
            <OptionGroup
              ref={configurator.flavorSectionRef}
              title="Chọn hương vị / cốt bánh"
              error={configurator.errors.selectedFlavor}
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {product.flavorOptions.map((flavor) => {
                  const optionAvailable = isProductOptionAvailable(
                    product,
                    { flavorId: flavor.id },
                    customization,
                  );
                  return (
                    <VariantOption
                      key={flavor.id}
                      active={customization.selectedFlavor === flavor.id}
                      available={optionAvailable}
                      imageCard={Boolean(flavor.imageUrl)}
                      presentation={{
                        title: flavor.label,
                        description: flavor.description,
                        imageUrl: flavor.imageUrl,
                        badge: flavor.badge,
                        price:
                          flavor.priceAdjustment
                            ? product.price + flavor.priceAdjustment
                            : undefined,
                      }}
                      onClick={() => configurator.selectFlavor(flavor.id)}
                    />
                  );
                })}
              </div>
            </OptionGroup>
          ) : null}

          {product.requiresMessage ? (
            <PersonalizationSection
              isOpen={configurator.isPersonalizationOpen}
              onToggle={() =>
                configurator.setIsPersonalizationOpen((current: boolean) => !current)
              }
              customization={customization}
              onChange={configurator.patchCustomization}
            />
          ) : null}

          <ProductOffers
            productTotal={
              configurator.missingSelection
                ? configurator.startingPrice * customization.quantity
                : configurator.totalPrice
            }
          />

          {fullPage ? (
            <>
              <ProductTrustDetails product={product} />
              <ProductInformation product={product} defaultOpen />
            </>
          ) : (
            <ProductInformation product={product} />
          )}

          {!fullPage && detailsHref ? (
            <Link
              href={detailsHref}
              onClick={onViewFullDetails}
              className="group flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border border-sand bg-cream px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-card text-brand-500 shadow-sm">
                  <Info className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-navy">
                    Xem đầy đủ thông tin sản phẩm →
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-text-muted">
                    Hình ảnh, thành phần, bảo quản và thông tin giao nhận
                  </span>
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductPurchaseActions({
  product,
  configurator,
  deliveryMode,
  source,
  onAddToCart,
  onBuyNow,
}: {
  product: Product;
  configurator: ProductConfigurator;
  deliveryMode: "delivery" | "pickup";
  source: ProductPurchaseSource;
  onAddToCart: (customization: ProductCustomization) => void;
  onBuyNow: (customization: ProductCustomization) => void;
}) {
  const availability = getProductOrderAvailability(product, deliveryMode);
  const { customization } = configurator;
  const actionLabel = !availability.canOrder
    ? availability.shortLabel
    : configurator.missingSelection === "size"
      ? "Chọn kích thước"
      : configurator.missingSelection === "flavor"
        ? "Chọn hương vị"
        : "Mua ngay";
  const shownPrice = configurator.missingSelection
    ? configurator.startingPrice * customization.quantity
    : configurator.totalPrice;

  const runAction = (
    event: "add_to_cart" | "buy_now",
    action: (value: ProductCustomization) => void,
  ) => {
    if (!availability.canOrder || !configurator.validateAndFocus()) return;
    import("@/features/product/product-analytics").then(({ trackProductEvent }) =>
      trackProductEvent(event, {
        productId: product.id,
        source,
        sizeId: customization.selectedSize,
        flavorId: customization.selectedFlavor,
        quantity: customization.quantity,
        value: configurator.totalPrice,
      }),
    );
    action(customization);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <QuantityControl
          quantity={customization.quantity}
          maxQuantity={Math.max(1, configurator.maxQuantity)}
          onChange={(quantity) => configurator.patchCustomization({ quantity })}
        />
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
            {configurator.missingSelection ? "Giá từ" : "Tạm tính"}
          </p>
          <p className="truncate text-base font-black text-brand-500">
            {formatPrice(shownPrice)}
          </p>
          {!configurator.missingSelection && (
            <p className="max-w-[190px] truncate text-[10px] font-semibold text-text-muted">
              {getSelectionSummary(product, customization)}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[0.9fr_1.1fr] gap-2.5">
        <button
          type="button"
          onClick={() => runAction("add_to_cart", onAddToCart)}
          disabled={!availability.canOrder || !configurator.canPurchase}
          className={clsx(
            "flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition active:scale-[0.98] sm:text-sm",
            availability.canOrder && configurator.canPurchase
              ? "border-navy bg-bg-card text-navy hover:bg-navy-soft"
              : "cursor-not-allowed border-sand bg-bg-soft text-text-light",
          )}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="truncate">Thêm vào giỏ</span>
        </button>
        <button
          type="button"
          onClick={() => runAction("buy_now", onBuyNow)}
          disabled={!availability.canOrder}
          className={clsx(
            "flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold text-white transition active:scale-[0.98] sm:text-sm",
            availability.canOrder
              ? "bg-brand-500 shadow-[0_8px_18px_rgba(194,74,54,0.2)] hover:bg-brand-600"
              : "cursor-not-allowed bg-beige",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">{actionLabel}</span>
        </button>
      </div>
    </div>
  );
}

function ProductGallery({
  product,
  customization,
  fullPage,
}: {
  product: Product;
  customization: ProductCustomization;
  fullPage: boolean;
}) {
  const images = useMemo(
    () =>
      Array.from(
        new Set(
          [
            product.imageUrl,
            ...(product.galleryImages ?? []),
            ...(product.sizeOptions?.map((option) => option.imageUrl) ?? []),
            ...(product.flavorOptions?.map((option) => option.imageUrl) ?? []),
          ].filter((value): value is string => Boolean(value)),
        ),
      ),
    [product],
  );
  const variantImage =
    product.flavorOptions?.find((item) => item.id === customization.selectedFlavor)?.imageUrl ||
    product.sizeOptions?.find((item) => item.id === customization.selectedSize)?.imageUrl;
  const [selectedImage, setSelectedImage] = useState(variantImage || images[0] || "");

  useEffect(() => {
    if (variantImage) setSelectedImage(variantImage);
  }, [variantImage]);

  return (
    <section className={clsx(fullPage && "lg:sticky lg:top-6 lg:self-start")}>
      <div className={clsx("relative aspect-[4/3] overflow-hidden bg-cream", fullPage && "lg:aspect-square lg:rounded-3xl")}>
        <ProductImage src={selectedImage} alt={product.name} loading="eager" className="object-contain p-2 sm:p-3 lg:p-5" />
        <div className="absolute right-3 top-3 z-10">
          <ProductShareButton
            product={product}
            label="Chia sẻ sản phẩm"
            iconOnly
            className="border-0 bg-white/95 text-navy shadow-md backdrop-blur"
          />
        </div>
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:px-0">
          {images.map((image) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(image)}
              aria-pressed={selectedImage === image}
              className={clsx(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-cream",
                selectedImage === image ? "border-brand-500 ring-2 ring-brand-100" : "border-sand",
              )}
            >
              <ProductImage src={image} alt={`${product.name} - ảnh sản phẩm`} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductSummary({
  product,
  customization,
  availability,
}: {
  product: Product;
  customization: ProductCustomization;
  availability: ReturnType<typeof getProductOrderAvailability>;
}) {
  const priceRange = getProductPriceRange(product);
  const hasUnselectedSize = Boolean(product.sizeOptions?.length && !customization.selectedSize);
  const price = hasUnselectedSize
    ? priceRange.min
    : getProductUnitPrice(product, customization.selectedSize, customization.selectedFlavor);
  const servingLabel = getServingLabel(product, customization.selectedSize);

  return (
    <header className="border-b border-sand pb-4">
      <h1 className="pr-12 text-xl font-black leading-tight text-navy lg:pr-0 lg:text-3xl">
        {product.name}
      </h1>
      <p className="mt-1.5 text-xl font-black text-brand-500 lg:text-2xl">
        {hasUnselectedSize ? <span className="mr-1 text-xs font-bold text-text-muted">Từ</span> : null}
        {formatPrice(price)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone={availability.canOrder ? "success" : "danger"}>{availability.label}</StatusBadge>
        {servingLabel ? <StatusBadge><CakeSlice className="h-3.5 w-3.5" />{servingLabel}</StatusBadge> : null}
        {product.preparationTimeMinutes ? <StatusBadge><Clock3 className="h-3.5 w-3.5" />Khoảng {product.preparationTimeMinutes} phút</StatusBadge> : null}
      </div>
      {product.description ? <p className="mt-3 text-[13px] leading-5 text-text-muted">{product.description}</p> : null}
      {product.sellingPoints?.length ? (
        <ul className="mt-3 grid gap-1.5 text-xs font-bold text-charcoal sm:grid-cols-2">
          {product.sellingPoints.slice(0, 4).map((point) => <li key={point}>✓ {point}</li>)}
        </ul>
      ) : null}
    </header>
  );
}

function FulfillmentCard({ mode, headline, detail, address, onChooseAddress }: { mode: "delivery" | "pickup"; headline: string; detail: string; address?: string; onChooseAddress: () => void }) {
  const Icon = mode === "pickup" ? Store : Truck;
  return (
    <section className="rounded-xl border border-teal/25 bg-teal-soft p-3">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-card text-teal shadow-sm"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0"><p className="text-xs font-black leading-5 text-navy">{headline}</p><p className="text-[11px] font-semibold leading-4 text-text-muted">{detail}</p></div>
      </div>
      {mode === "delivery" ? (
        <button type="button" onClick={onChooseAddress} className="mt-2 flex min-h-10 w-full items-center gap-1.5 border-t border-sand pt-2 text-left text-xs font-bold text-teal">
          <MapPin className="h-4 w-4 shrink-0" /><span className="line-clamp-2">{address || "Chọn địa chỉ giao hàng"}</span>
        </button>
      ) : null}
    </section>
  );
}

const OptionGroup = forwardRef<HTMLDivElement, { title: string; error?: string; children: ReactNode }>(
  function OptionGroup({ title, error, children }, ref) {
    return (
      <section ref={ref}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="text-sm font-black text-navy">{title} <span className="text-brand-500">*</span></h2>
          {error ? <span role="alert" className="text-right text-[11px] font-bold text-brand-600">{error}</span> : null}
        </div>
        {children}
      </section>
    );
  },
);

function VariantOption({ active, available, presentation, onClick, imageCard = false }: { active: boolean; available: boolean; presentation: Omit<SizePresentation, "price"> & { price?: number }; onClick: () => void; imageCard?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      aria-pressed={active}
      className={clsx(
        "relative min-h-[64px] overflow-hidden rounded-xl border p-2.5 text-left transition",
        imageCard && "flex min-h-[132px] flex-col",
        active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-sand bg-bg-card hover:border-brand-300",
        !available && "cursor-not-allowed opacity-45 grayscale",
      )}
    >
      {presentation.badge ? <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-[#fff0d8] px-1.5 py-0.5 text-[9px] font-black text-[#9a6526]">{presentation.badge}</span> : null}
      {imageCard && presentation.imageUrl ? (
        <span className="relative mb-2 block min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-cream"><ProductImage src={presentation.imageUrl} alt={presentation.title} /></span>
      ) : null}
      <span className="block text-xs font-black leading-4 text-navy">{presentation.title}</span>
      {presentation.servings || presentation.description ? <span className="mt-0.5 block text-[10px] font-semibold leading-4 text-text-muted">{presentation.servings || presentation.description}</span> : null}
      {presentation.price !== undefined ? <span className="mt-1 block text-[11px] font-black text-brand-500">{formatPrice(presentation.price)}</span> : null}
      {!available ? <span className="mt-1 block text-[10px] font-bold text-text-muted">Tạm hết</span> : null}
    </button>
  );
}

function PersonalizationSection({ isOpen, onToggle, customization, onChange }: { isOpen: boolean; onToggle: () => void; customization: ProductCustomization; onChange: (patch: Partial<ProductCustomization>) => void }) {
  const summary = [customization.customMessage && `“${customization.customMessage}”`, customization.candles ? `${customization.candles} nến` : ""].filter(Boolean).join(" · ");
  return (
    <section className="rounded-2xl border border-sand bg-cream">
      <button type="button" onClick={onToggle} className="flex min-h-16 w-full items-center justify-between gap-3 p-3 text-left" aria-expanded={isOpen}>
        <span className="min-w-0"><span className="block text-sm font-black text-navy">Cá nhân hóa bánh</span><span className="mt-0.5 block truncate text-[11px] font-semibold text-text-muted">{summary || "Thêm lời chúc, tuổi hoặc số lượng nến"}</span></span>
        <span className="shrink-0 text-xs font-black text-brand-500">{isOpen ? "Thu gọn" : summary ? "Chỉnh sửa" : "Thêm"}</span>
      </button>
      {isOpen ? (
        <div className="grid gap-3 border-t border-sand p-3 sm:grid-cols-[1fr_112px]">
          <label className="text-xs font-black text-navy">Lời chúc trên bánh<textarea value={customization.customMessage ?? ""} onChange={(event) => onChange({ customMessage: event.target.value })} placeholder="Ví dụ: Chúc mừng sinh nhật" rows={2} maxLength={100} className="mt-1.5 w-full resize-none rounded-xl border border-sand bg-bg-card px-3 py-2 text-sm font-medium outline-none focus:border-brand-500" /></label>
          <label className="text-xs font-black text-navy">Số nến<input type="number" min="0" max="99" value={customization.candles || ""} onChange={(event) => onChange({ candles: Math.min(99, Math.max(0, Number(event.target.value) || 0)) })} placeholder="0" className="mt-1.5 h-10 w-full rounded-xl border border-sand bg-bg-card px-3 text-sm font-medium outline-none focus:border-brand-500" /></label>
        </div>
      ) : null}
    </section>
  );
}

function ProductTrustDetails({ product }: { product: Product }) {
  const facts = [
    product.servingSize ? ["Khẩu phần", product.servingSize] : null,
    product.storage ? ["Bảo quản", product.storage] : null,
    product.shelfLife ? ["Dùng ngon", product.shelfLife] : null,
    product.requiresPreorder ? ["Đặt trước", `Ít nhất ${product.preorderMinHours ?? 0} giờ`] : null,
  ].filter((fact): fact is string[] => Boolean(fact));
  if (!facts.length) return null;
  return (
    <section className="rounded-2xl border border-sand bg-bg-card p-4">
      <h2 className="text-base font-black text-navy">Thông tin cần biết trước khi đặt</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {facts.map(([label, value]) => <div key={label}><dt className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</dt><dd className="mt-1 text-sm font-semibold text-charcoal">{value}</dd></div>)}
      </dl>
    </section>
  );
}

function ProductInformation({ product, defaultOpen = false }: { product: Product; defaultOpen?: boolean }) {
  const sections = [
    product.ingredients?.length || product.allergens?.length
      ? { title: "Thành phần & chất gây dị ứng", content: [product.ingredients?.length ? `Thành phần: ${product.ingredients.join(", ")}` : "", product.allergens?.length ? `Chất gây dị ứng: ${product.allergens.join(", ")}` : ""].filter(Boolean) }
      : null,
    product.storage || product.shelfLife
      ? { title: "Bảo quản & hạn dùng", content: [product.storage ? `Bảo quản: ${product.storage}` : "", product.shelfLife ? `Dùng ngon nhất: ${product.shelfLife}` : ""].filter(Boolean) }
      : null,
  ].filter((section): section is { title: string; content: string[] } => Boolean(section));
  if (!sections.length) return null;
  return (
    <section className="divide-y divide-sand border-y border-sand">
      {sections.map((section, index) => (
        <details key={section.title} open={defaultOpen && index === 0} className="group py-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-black text-navy">{section.title}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="space-y-2 rounded-xl bg-cream p-3">{section.content.map((line) => <p key={line} className="text-xs leading-5 text-text-muted">{line}</p>)}</div>
        </details>
      ))}
    </section>
  );
}

function QuantityControl({ quantity, maxQuantity, onChange }: { quantity: number; maxQuantity: number; onChange: (quantity: number) => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center rounded-xl border border-sand bg-cream p-1">
      <button type="button" onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} className="grid h-9 w-9 place-items-center rounded-lg text-charcoal disabled:opacity-35" aria-label="Giảm số lượng"><Minus className="h-4 w-4" /></button>
      <span className="min-w-7 text-center text-sm font-black text-navy">{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)} disabled={quantity >= maxQuantity} className="grid h-9 w-9 place-items-center rounded-lg text-charcoal disabled:opacity-35" aria-label="Tăng số lượng"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "danger" }) {
  const styles = { neutral: "bg-bg-soft text-charcoal", success: "bg-[#eef7e9] text-[#38752f]", danger: "bg-brand-50 text-brand-600" };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black", styles[tone])}>{children}</span>;
}

function getSelectionSummary(product: Product, customization: ProductCustomization) {
  return [
    product.sizeOptions?.find((option) => option.id === customization.selectedSize)?.label,
    product.flavorOptions?.find((option) => option.id === customization.selectedFlavor)?.label,
  ].filter(Boolean).join(" · ");
}
