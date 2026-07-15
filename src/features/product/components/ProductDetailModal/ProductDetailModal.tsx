"use client";

import {
  forwardRef,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CakeSlice,
  ChevronDown,
  Clock3,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import { clsx } from "clsx";

import { BottomSheet } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import { ProductOffers } from "@/features/product/components/ProductOffers";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import {
  getProductTotal,
  hasProductOptions,
  validateProductCustomization,
  type ProductCustomization,
  type ProductCustomizationErrors,
} from "@/features/product/product-cart";
import {
  getFulfillmentPromise,
  getServingLabel,
  getSizePresentation,
  type SizePresentation,
} from "@/features/product/product-sales";
import { formatPrice } from "@/lib/utils";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { Product } from "@/types";

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customization: ProductCustomization) => void;
  onBuyNow?: (customization: ProductCustomization) => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const { config } = useOrderConfigStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(product.flavorOptions?.[0]?.id);
  const [customMessage, setCustomMessage] = useState("");
  const [candles, setCandles] = useState(0);
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [errors, setErrors] = useState<ProductCustomizationErrors>({});
  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const flavorSectionRef = useRef<HTMLDivElement>(null);
  const galleryImages = useMemo(
    () =>
      Array.from(
        new Set([product.imageUrl, ...(product.galleryImages ?? [])].filter(Boolean)),
      ),
    [product.galleryImages, product.imageUrl],
  );
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] ?? "");

  useEffect(() => {
    setQuantity(1);
    setSelectedSize(undefined);
    setSelectedFlavor(product.flavorOptions?.[0]?.id);
    setCustomMessage("");
    setCandles(0);
    setIsPersonalizationOpen(false);
    setErrors({});
    setSelectedImage(galleryImages[0] ?? "");
  }, [galleryImages, product.id]);

  const customization: ProductCustomization = {
    quantity,
    selectedSize,
    selectedFlavor,
    customMessage,
    candles,
  };
  const totalPrice = getProductTotal(product, customization);
  const availability = getProductAvailability(product, config.deliveryMode);
  const fulfillment = getFulfillmentPromise(product, config.deliveryMode);
  const maxQuantity = getMaxQuantity(product);
  const expanded = hasProductOptions(product) || galleryImages.length > 1;

  const runValidatedAction = (
    action: (nextCustomization: ProductCustomization) => void,
  ) => {
    if (!availability.canOrder) return;
    const nextErrors = validateProductCustomization(product, customization);
    setErrors(nextErrors);
    if (nextErrors.selectedSize) {
      sizeSectionRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    if (nextErrors.selectedFlavor) {
      flavorSectionRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    action(customization);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      expanded={expanded}
      className="lg:max-w-3xl"
      footer={
        <div className="flex items-center gap-3">
          <QuantityControl
            quantity={quantity}
            maxQuantity={maxQuantity}
            onChange={(next) => setQuantity(Math.min(maxQuantity, Math.max(1, next)))}
          />
          <button
            type="button"
            onClick={() => runValidatedAction(onAddToCart)}
            disabled={!availability.canOrder}
            className={clsx(
              "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-black transition active:scale-[0.98]",
              onBuyNow
                ? availability.canOrder
                  ? "border border-[#b84a39] bg-white text-[#b84a39]"
                  : "cursor-not-allowed border border-[#d7cbc4] bg-[#f5f0ed] text-[#aa9a91]"
                : availability.canOrder
                  ? "bg-[#b84a39] text-white shadow-[0_8px_18px_rgba(184,74,57,0.24)] hover:bg-[#9e3e2f]"
                  : "cursor-not-allowed bg-[#cdbeb5] text-white",
            )}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {availability.canOrder
                ? onBuyNow
                  ? "Thêm vào giỏ"
                  : `Thêm · ${formatPrice(totalPrice)}`
                : availability.shortLabel}
            </span>
          </button>
          {onBuyNow ? (
            <button
              type="button"
              onClick={() => runValidatedAction(onBuyNow)}
              disabled={!availability.canOrder}
              className={clsx(
                "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-black text-white transition active:scale-[0.98]",
                availability.canOrder
                  ? "bg-[#b84a39] shadow-[0_8px_18px_rgba(184,74,57,0.24)] hover:bg-[#9e3e2f]"
                  : "cursor-not-allowed bg-[#cdbeb5]",
              )}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="truncate">Mua ngay</span>
            </button>
          ) : null}
        </div>
      }
    >
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-5 lg:p-5">
        <ProductGallery
          product={product}
          images={galleryImages}
          selectedImage={selectedImage}
          onImageChange={setSelectedImage}
        />

        <div className="px-4 pb-5 pt-4 lg:px-0 lg:py-0">
          <ProductSummary
            product={product}
            availability={availability}
            servingLabel={getServingLabel(product, selectedSize)}
          />

          <div className="space-y-5 py-5">
            <FulfillmentCard
              mode={config.deliveryMode}
              headline={fulfillment.headline}
              detail={fulfillment.detail}
              address={config.deliveryAddress?.formattedAddress}
              onChooseAddress={() => setIsAddressModalOpen(true)}
            />

            {product.sizeOptions?.length ? (
              <OptionGroup
                ref={sizeSectionRef}
                title="Chọn kích thước"
                error={errors.selectedSize}
              >
                {product.sizeOptions.map((size) => (
                  <VariantOption
                    key={size.id}
                    active={selectedSize === size.id}
                    presentation={getSizePresentation(product, size)}
                    onClick={() => {
                      setSelectedSize(size.id);
                      if (size.imageUrl) setSelectedImage(size.imageUrl);
                      setErrors((current) => ({ ...current, selectedSize: undefined }));
                    }}
                  />
                ))}
              </OptionGroup>
            ) : null}

            {product.flavorOptions?.length ? (
              <OptionGroup
                ref={flavorSectionRef}
                title="Chọn hương vị / cốt bánh"
                error={errors.selectedFlavor}
                carousel
              >
                {product.flavorOptions.map((flavor) => (
                  <VariantOption
                    key={flavor.id}
                    active={selectedFlavor === flavor.id}
                    imageCard
                    presentation={{
                      title: flavor.label,
                      description: flavor.description,
                      imageUrl: flavor.imageUrl,
                      badge: flavor.badge,
                    }}
                    onClick={() => {
                      setSelectedFlavor(flavor.id);
                      setErrors((current) => ({ ...current, selectedFlavor: undefined }));
                    }}
                  />
                ))}
              </OptionGroup>
            ) : null}

            {product.requiresMessage && (
              <PersonalizationSection
                isOpen={isPersonalizationOpen}
                onToggle={() => setIsPersonalizationOpen((current) => !current)}
                customMessage={customMessage}
                onMessageChange={setCustomMessage}
                candles={candles}
                onCandlesChange={setCandles}
              />
            )}

            <ProductOffers productTotal={totalPrice} />
            <ProductInformation product={product} />
          </div>
        </div>
      </div>
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </BottomSheet>
  );
}

function ProductGallery({
  product,
  images,
  selectedImage,
  onImageChange,
}: {
  product: Product;
  images: string[];
  selectedImage: string;
  onImageChange: (image: string) => void;
}) {
  const currentIndex = Math.max(0, images.indexOf(selectedImage));
  return (
    <div className="lg:sticky lg:top-0 lg:self-start">
      <div
        className="relative flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto bg-[#fdf7f0] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:aspect-square lg:rounded-[16px]"
        onScroll={(event) => {
          const element = event.currentTarget;
          const index = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
          if (images[index] && images[index] !== selectedImage) onImageChange(images[index]);
        }}
      >
        {images.map((imageUrl, index) => (
          <div key={imageUrl} className="relative h-full w-full shrink-0 snap-center">
            <ProductImage
              src={imageUrl}
              alt={`${product.name} ${index + 1}`}
              className="object-contain p-2 sm:p-3 lg:p-4"
            />
          </div>
        ))}
        <div className="absolute right-14 top-3 z-10">
          <ProductShareButton
            product={product}
            label="Chia sẻ sản phẩm"
            iconOnly
            className="border-0 bg-white/95 text-[#4f3022] shadow-md backdrop-blur"
          />
        </div>
        <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-black text-white">{currentIndex + 1}/{images.length}</span>
      </div>
    </div>
  );
}

function ProductSummary({
  product,
  availability,
  servingLabel,
}: {
  product: Product;
  availability: ReturnType<typeof getProductAvailability>;
  servingLabel?: string;
}) {
  return (
    <div className="border-b border-[#f3e6dc] pb-4">
      <h3 className="pr-12 text-[20px] font-black leading-tight text-[#3d2417] lg:pr-0 lg:text-2xl">
        {product.name}
      </h3>
      <p className="mt-1.5 text-xl font-black text-[#b84a39]">
        {product.sizeOptions?.length ? (
          <span className="mr-1 text-xs font-bold text-[#9b8171]">từ</span>
        ) : null}
        {formatPrice(product.price)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone={availability.canOrder ? "success" : "danger"}>
          {availability.label}
        </StatusBadge>
        {servingLabel && (
          <StatusBadge>
            <CakeSlice className="h-3.5 w-3.5" />
            {servingLabel}
          </StatusBadge>
        )}
        {product.preparationTimeMinutes ? (
          <StatusBadge>
            <Clock3 className="h-3.5 w-3.5" />
            Khoảng {product.preparationTimeMinutes} phút
          </StatusBadge>
        ) : null}
      </div>
      {product.description && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[#7b6254]">
          {product.description}
        </p>
      )}
      {product.sellingPoints?.length ? (
        <p className="mt-2 line-clamp-1 text-[11px] font-bold text-[#9a6f58]">
          {product.sellingPoints.slice(0, 3).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function FulfillmentCard({
  mode,
  headline,
  detail,
  address,
  onChooseAddress,
}: {
  mode: "delivery" | "pickup";
  headline: string;
  detail: string;
  address?: string;
  onChooseAddress: () => void;
}) {
  const Icon = mode === "pickup" ? Store : Truck;
  return (
    <section className="rounded-[14px] border border-[#dcece7] bg-[#f2faf7] p-3">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#278477] shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black leading-5 text-[#254f49]">{headline}</p>
          <p className="text-[11px] font-semibold leading-4 text-[#66847f]">{detail}</p>
        </div>
      </div>
      {mode === "delivery" && (
        <button type="button" onClick={onChooseAddress} className="mt-2 flex w-full items-center gap-1.5 border-t border-[#dcece7] pt-2 text-left text-[11px] font-bold text-[#52766f]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{address || "Nhấn vào đây để chọn vị trí"}</span>
        </button>
      )}
    </section>
  );
}

const OptionGroup = forwardRef<
  HTMLDivElement,
  { title: string; error?: string; children: ReactNode; carousel?: boolean }
>(function OptionGroup({ title, error, children, carousel }, ref) {
  return (
    <section ref={ref}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-black text-[#3d2417]">
          {title} <span className="text-[#b84a39]">*</span>
        </h4>
        {error && <span className="text-[11px] font-bold text-[#9e3e2f]">{error}</span>}
      </div>
      <div className={carousel ? "-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&>*]:w-[36%] [&>*]:shrink-0 [&>*]:snap-start [&::-webkit-scrollbar]:hidden" : "grid grid-cols-2 gap-2"}>{children}</div>
    </section>
  );
});

function VariantOption({
  active,
  presentation,
  onClick,
  imageCard = false,
}: {
  active: boolean;
  presentation: Omit<SizePresentation, "price"> & { price?: number };
  onClick: () => void;
  imageCard?: boolean;
}) {
  if (imageCard) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={clsx(
          "flex aspect-square flex-col overflow-hidden rounded-[14px] border bg-white p-1.5 text-left transition",
          active
            ? "border-[#b84a39] ring-2 ring-[#b84a39]/15"
            : "border-[#eadbcc] hover:border-[#b84a39]/50",
        )}
      >
        <span className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[10px] bg-[#f8eee6]">
          <ProductImage
            src={presentation.imageUrl}
            alt={presentation.title}
            className="object-cover"
          />
        </span>
        <span className="block w-full shrink-0 truncate px-1 pb-0.5 pt-1.5 text-center text-[11px] font-normal text-[#3d2417]">
          {presentation.title}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "relative min-h-[64px] overflow-hidden rounded-[12px] border p-2.5 text-left transition",
        active
          ? "border-[#b84a39] bg-[#fff4f5] ring-1 ring-[#b84a39]/15"
          : "border-[#eadbcc] bg-white hover:border-[#b84a39]/50",
      )}
    >
      {presentation.badge && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-[#fff0d8] px-1.5 py-0.5 text-[9px] font-black text-[#9a6526]">
          {presentation.badge}
        </span>
      )}
      <div className="flex gap-2">
        {presentation.imageUrl && (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[#f8eee6]">
            <ProductImage
              src={presentation.imageUrl}
              alt={presentation.title}
              className="object-cover"
            />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-xs font-black text-[#3d2417]">
            {presentation.title}
          </span>
          {(presentation.servings || presentation.description) && (
            <span className="mt-0.5 block line-clamp-1 text-[10px] font-semibold text-[#8c7568]">
              {presentation.servings || presentation.description}
            </span>
          )}
          {presentation.price !== undefined && (
            <span className="mt-1 block text-[11px] font-black text-[#b84a39]">
              {formatPrice(presentation.price)}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

function PersonalizationSection({
  isOpen,
  onToggle,
  customMessage,
  onMessageChange,
  candles,
  onCandlesChange,
}: {
  isOpen: boolean;
  onToggle: () => void;
  customMessage: string;
  onMessageChange: (value: string) => void;
  candles: number;
  onCandlesChange: (value: number) => void;
}) {
  const summary = [customMessage && `“${customMessage}”`, candles > 0 && `${candles} nến`]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className="rounded-[14px] border border-[#f0dfd4] bg-[#fffaf6]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="block text-sm font-black text-[#3d2417]">Cá nhân hóa bánh</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8c7568]">
            {summary || "Thêm lời chúc, tuổi hoặc số lượng nến"}
          </span>
        </span>
        <span className="shrink-0 text-xs font-black text-[#b84a39]">
          {isOpen ? "Thu gọn" : summary ? "Chỉnh sửa" : "Thêm"}
        </span>
      </button>
      {isOpen && (
        <div className="grid gap-3 border-t border-[#f0dfd4] p-3 sm:grid-cols-[1fr_112px]">
          <label className="text-xs font-black text-[#3d2417]">
            Lời chúc trên bánh
            <textarea
              value={customMessage}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Ví dụ: Chúc mừng sinh nhật"
              rows={2}
              maxLength={100}
              className="mt-1.5 w-full resize-none rounded-[11px] border border-[#eadbcc] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#b84a39]"
            />
          </label>
          <label className="text-xs font-black text-[#3d2417]">
            Số nến
            <input
              type="number"
              min="0"
              max="99"
              value={candles || ""}
              onChange={(event) =>
                onCandlesChange(Math.min(99, Math.max(0, Number(event.target.value) || 0)))
              }
              placeholder="0"
              className="mt-1.5 h-10 w-full rounded-[11px] border border-[#eadbcc] bg-white px-3 text-sm font-medium outline-none focus:border-[#b84a39]"
            />
          </label>
        </div>
      )}
    </section>
  );
}

function ProductInformation({ product }: { product: Product }) {
  const ingredientFacts = [
    product.ingredients?.length ? ["Thành phần", product.ingredients.join(", ")] : null,
    product.allergens?.length ? ["Dị ứng", product.allergens.join(", ")] : null,
  ].filter((fact): fact is string[] => Boolean(fact));
  const storageFacts = [
    product.storage ? ["Bảo quản", product.storage] : null,
    product.shelfLife ? ["Dùng ngon", product.shelfLife] : null,
  ].filter((fact): fact is string[] => Boolean(fact));

  if (!ingredientFacts.length && !storageFacts.length && !product.nutrition) return null;
  return (
    <section className="divide-y divide-[#f3e6dc] border-t border-[#f3e6dc]">
      {ingredientFacts.length > 0 && (
        <FactDetails title="Thành phần & chất gây dị ứng" facts={ingredientFacts} />
      )}
      {product.nutrition && <NutritionDetails product={product} />}
      {storageFacts.length > 0 && (
        <FactDetails title="Bảo quản & hạn dùng" facts={storageFacts} />
      )}
    </section>
  );
}

function FactDetails({ title, facts }: { title: string; facts: string[][] }) {
  return (
    <details className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[#3d2417]">
        {title}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <dl className="mt-3 space-y-2 rounded-[12px] bg-[#fffaf6] p-3">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[72px_1fr] gap-2 text-xs leading-5">
            <dt className="font-black text-[#65483a]">{label}</dt>
            <dd className="text-[#7b6254]">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function NutritionDetails({ product }: { product: Product }) {
  const nutrition = product.nutrition;
  if (!nutrition) return null;
  const values = [
    ["Năng lượng", nutrition.caloriesKcal, "kcal"],
    ["Protein", nutrition.proteinG, "g"],
    ["Carbohydrate", nutrition.carbohydratesG, "g"],
    ["Đường", nutrition.sugarG, "g"],
    ["Chất béo", nutrition.fatG, "g"],
    ["Natri", nutrition.sodiumMg, "mg"],
  ].filter(([, value]) => value !== undefined);
  if (values.length === 0) return null;

  return (
    <details className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[#3d2417]">
        Dinh dưỡng ước tính
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 rounded-[12px] bg-[#fffaf6] p-3">
        <p className="mb-2 text-[10px] font-bold text-[#8c7568]">
          {nutrition.basis === "per_100g" ? "Theo 100g" : `Mỗi khẩu phần${nutrition.servingSize ? ` · ${nutrition.servingSize}` : ""}`}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {values.map(([label, value, unit]) => (
            <div key={String(label)} className="flex justify-between gap-2 text-xs">
              <dt className="text-[#7b6254]">{label}</dt>
              <dd className="font-black text-[#3d2417]">{value}{unit}</dd>
            </div>
          ))}
        </dl>
        {nutrition.source && (
          <p className="mt-3 text-[10px] leading-4 text-[#9b8171]">Nguồn: {nutrition.source}</p>
        )}
      </div>
    </details>
  );
}

function QuantityControl({ quantity, maxQuantity, onChange }: { quantity: number; maxQuantity: number; onChange: (quantity: number) => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center rounded-[14px] border border-[#eadbcc] bg-[#fffaf6] p-1">
      <button type="button" onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} className="grid h-9 w-9 place-items-center rounded-[10px] text-[#65483a] disabled:opacity-35" aria-label="Giảm số lượng">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-7 text-center text-sm font-black text-[#3d2417]">{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)} disabled={quantity >= maxQuantity} className="grid h-9 w-9 place-items-center rounded-[10px] text-[#65483a] disabled:opacity-35" aria-label="Tăng số lượng">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "danger" }) {
  const styles = {
    neutral: "bg-[#f7f0ea] text-[#765b4d]",
    success: "bg-[#eef7e9] text-[#38752f]",
    danger: "bg-[#fff0ef] text-[#bd4656]",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black", styles[tone])}>{children}</span>;
}

function getMaxQuantity(product: Product) {
  if (product.stock === undefined || product.stock <= 0) return 99;
  return Math.max(1, Math.min(99, product.stock));
}

function getProductAvailability(product: Product, mode: "delivery" | "pickup") {
  if (product.isAvailable === false) return { canOrder: false, label: "Tạm ngừng bán", shortLabel: "Tạm ngừng bán" };
  if (product.stock !== undefined && product.stock <= 0) return { canOrder: false, label: "Đã hết hàng", shortLabel: "Hết hàng" };
  if (mode === "pickup" && product.availableForPickup === false) return { canOrder: false, label: "Chỉ hỗ trợ giao hàng", shortLabel: "Không hỗ trợ nhận tại quán" };
  if (mode === "delivery" && product.availableForDelivery === false) return { canOrder: false, label: "Chỉ nhận tại quán", shortLabel: "Không hỗ trợ giao hàng" };
  if (product.availableToday === false && !product.requiresPreorder) return { canOrder: false, label: "Không bán hôm nay", shortLabel: "Không bán hôm nay" };
  if (product.requiresPreorder) {
    const hours = product.preorderMinHours ?? 0;
    return { canOrder: true, label: hours > 0 ? `Đặt trước ít nhất ${hours} giờ` : "Cần đặt trước", shortLabel: "Đặt trước" };
  }
  return { canOrder: true, label: mode === "pickup" ? "Có thể nhận tại quán" : "Có thể giao tận nơi", shortLabel: "Thêm vào giỏ" };
}
