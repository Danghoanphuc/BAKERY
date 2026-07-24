import { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ImagePlus, Loader2, Plus, RefreshCw, Star, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import type { Category, FinanceIngredient, FlavorOption, InventoryBalance, InventoryMovement, ProductVariantCombination, ProductWorkspaceCardConfig, ProductWorkspaceCardId, ProductionStep, RecipeVersion, SizeOption } from "@/types";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { createInternalBarcode, createProductSku } from "@/lib/product-identifiers";
import type { ProductFormData } from "../_lib/product-form";
import { splitTags } from "../_lib/product-form";

export function SalesInfoSection({
  categories,
  formData,
  setFormData,
}: {
  categories: Category[];
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Thông tin bán hàng">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Tên nội bộ"
            required
            value={formData.name}
            onChange={(name) => setFormData((prev) => ({ ...prev, name }))}
            className="sm:col-span-2"
          />
          <TextField
            label="Tên hiển thị website"
            required
            value={formData.displayName}
            onChange={(displayName) => setFormData((prev) => ({ ...prev, displayName }))}
            className="sm:col-span-2"
          />
          <NumberField
            label="Giá bán (VND)"
            required
            min={0}
            value={formData.price}
            onChange={(price) => setFormData((prev) => ({ ...prev, price }))}
          />
          <CategoryPicker
            categories={categories}
            value={formData.categoryId}
            onChange={(categoryId) =>
              setFormData((prev) => ({ ...prev, categoryId }))
            }
          />
          <TextAreaField
            label="Mô tả dài"
            value={formData.description}
            onChange={(description) =>
              setFormData((prev) => ({ ...prev, description }))
            }
            className="sm:col-span-2"
          />
          <TextAreaField
            label="Mô tả ngắn"
            value={formData.shortDescription}
            onChange={(shortDescription) =>
              setFormData((prev) => ({ ...prev, shortDescription }))
            }
            className="sm:col-span-2"
          />
        </div>

        <ProductImageUploader formData={formData} setFormData={setFormData} />
      </div>
    </FormSection>
  );
}

export function WorkspaceCardSettingsSection({
  cardId,
  cardLabel,
  defaultDescription,
  formData,
  setFormData,
}: {
  cardId: ProductWorkspaceCardId;
  cardLabel: string;
  defaultDescription: string;
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  const card = formData.workspaceCards[cardId] ?? {};
  const updateCard = (updates: Partial<ProductWorkspaceCardConfig>) => {
    setFormData((prev) => ({
      ...prev,
      workspaceCards: {
        ...prev.workspaceCards,
        [cardId]: { ...prev.workspaceCards[cardId], ...updates },
      },
    }));
  };

  return (
    <FormSection title={`Thiết lập thẻ ${cardLabel}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <TextAreaField label="Nội dung trên thẻ" value={card.description ?? defaultDescription} onChange={(description) => updateCard({ description })} />
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-5 text-neutral-600">Số liệu ở cuối thẻ (giá, tồn, số tùy chọn…) luôn lấy từ dữ liệu nghiệp vụ thực tế và không sửa tay tại đây.</div>
        </div>
        <CardIllustrationUploader value={card.illustrationUrl ?? ""} onChange={(illustrationUrl) => updateCard({ illustrationUrl })} />
      </div>
    </FormSection>
  );
}

export function StorefrontSection({
  categories,
  formData,
  setFormData,
}: {
  categories: Category[];
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Thông tin hiển thị trên cửa hàng">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Tên nội bộ" required value={formData.name} onChange={(name) => setFormData((prev) => ({ ...prev, name }))} className="sm:col-span-2" />
          <TextField label="Tên hiển thị website" required value={formData.displayName} onChange={(displayName) => setFormData((prev) => ({ ...prev, displayName }))} className="sm:col-span-2" />
          <NumberField label="Giá niêm yết (VNĐ)" required min={0} value={formData.price} onChange={(price) => setFormData((prev) => ({ ...prev, price }))} />
          <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2"><p className="text-xs font-semibold text-neutral-500">Hiển thị cho khách</p><p className="mt-1 text-lg font-black text-neutral-950">{formatCurrency(formData.price)}</p></div>
          <CategoryPicker categories={categories} value={formData.categoryId} onChange={(categoryId) => setFormData((prev) => ({ ...prev, categoryId }))} />
          <TextAreaField label="Mô tả ngắn" value={formData.shortDescription} onChange={(shortDescription) => setFormData((prev) => ({ ...prev, shortDescription }))} className="sm:col-span-2" />
        </div>
        <StorefrontPreview formData={formData} />
      </div>
    </FormSection>
  );
}

export function SalesAvailabilitySection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Trạng thái bán & kênh phục vụ">
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleRow label="Đang mở bán trên cửa hàng" checked={formData.isAvailable} onChange={(isAvailable) => setFormData((prev) => ({ ...prev, isAvailable }))} />
        <ToggleRow label="Có sẵn hôm nay" checked={formData.availableToday} onChange={(availableToday) => setFormData((prev) => ({ ...prev, availableToday }))} />
        <ToggleRow label="Cho phép giao tận nơi" checked={formData.availableForDelivery} onChange={(availableForDelivery) => setFormData((prev) => ({ ...prev, availableForDelivery }))} />
        <ToggleRow label="Cho phép đến quán lấy" checked={formData.availableForPickup} onChange={(availableForPickup) => setFormData((prev) => ({ ...prev, availableForPickup }))} />
        <ToggleRow label="Chỉ bán khi đặt trước" checked={formData.requiresPreorder} onChange={(requiresPreorder) => setFormData((prev) => ({ ...prev, requiresPreorder }))} />
        <ToggleRow label="Cho nhập lời chúc trên bánh" checked={formData.requiresMessage} onChange={(requiresMessage) => setFormData((prev) => ({ ...prev, requiresMessage }))} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <NumberField label="Đặt trước tối thiểu (giờ)" min={0} value={formData.preorderMinHours} onChange={(preorderMinHours) => setFormData((prev) => ({ ...prev, preorderMinHours }))} />
        <TextField label="Bán từ (HH:mm)" value={formData.availableFrom} onChange={(availableFrom) => setFormData((prev) => ({ ...prev, availableFrom }))} />
        <TextField label="Bán đến (HH:mm)" value={formData.availableUntil} onChange={(availableUntil) => setFormData((prev) => ({ ...prev, availableUntil }))} />
      </div>
    </FormSection>
  );
}

export function ProductMediaSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return <FormSection title="Thư viện ảnh"><ProductImageUploader formData={formData} setFormData={setFormData} compact /><p className="mt-3 text-xs text-neutral-500">Video sẽ được bổ sung cùng trình quản lý media; hiện tại ảnh đầu tiên là ảnh đại diện trên cửa hàng.</p></FormSection>;
}

export function ProductContentSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Nội dung trang sản phẩm">
      <div className="space-y-3">
        <TextAreaField label="Mô tả dài" value={formData.description} onChange={(description) => setFormData((prev) => ({ ...prev, description }))} />
        <div className="grid gap-3 md:grid-cols-2">
          <TagInput label="Điểm bán hàng nổi bật" value={formData.sellingPoints} placeholder="Làm mới sau khi đặt, kem cheese nhập khẩu" onChange={(sellingPoints) => setFormData((prev) => ({ ...prev, sellingPoints }))} />
          <TextField label="Khẩu phần gợi ý" value={formData.servingSuggestion} onChange={(servingSuggestion) => setFormData((prev) => ({ ...prev, servingSuggestion }))} />
          <TagInput label="Thành phần hiển thị" value={formData.ingredients} placeholder="bột mì, trứng, bơ" onChange={(ingredients) => setFormData((prev) => ({ ...prev, ingredients }))} />
          <TagInput label="Dịp sử dụng" value={formData.occasionTags} placeholder="sinh nhật, kỷ niệm" onChange={(occasionTags) => setFormData((prev) => ({ ...prev, occasionTags }))} />
        </div>
      </div>
    </FormSection>
  );
}

export function PublishingMetadataSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="SEO, mạng xã hội & thông tin lọc">
      <div className="space-y-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-3"><p className="mb-3 text-xs font-bold uppercase text-neutral-500">Nội dung chia sẻ</p><div className="space-y-3"><TextField label="Tiêu đề khi chia sẻ" value={formData.socialTitle} onChange={(socialTitle) => setFormData((prev) => ({ ...prev, socialTitle }))} /><TextAreaField label="Mô tả chào hàng" value={formData.socialDescription} onChange={(socialDescription) => setFormData((prev) => ({ ...prev, socialDescription }))} /><TextField label="Ảnh social riêng" value={formData.socialImageUrl} onChange={(socialImageUrl) => setFormData((prev) => ({ ...prev, socialImageUrl }))} /><TagInput label="Hashtag" value={formData.socialHashtags} placeholder="banhsinhnhat, bakery" onChange={(socialHashtags) => setFormData((prev) => ({ ...prev, socialHashtags }))} /></div></div>
        <SocialMetadataPreview formData={formData} />
        <div className="grid gap-3 md:grid-cols-2"><TagInput label="Tag sản phẩm" value={formData.tags} placeholder="socola, bánh nướng" onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))} /><TagInput label="Từ khóa tìm kiếm" value={formData.searchKeywords} placeholder="bánh sinh nhật, giao hôm nay" onChange={(searchKeywords) => setFormData((prev) => ({ ...prev, searchKeywords }))} /><TagInput label="Chế độ ăn" value={formData.dietaryTags} placeholder="ít ngọt, keto, vegan" onChange={(dietaryTags) => setFormData((prev) => ({ ...prev, dietaryTags }))} /><TagInput label="Dị ứng" value={formData.allergens} placeholder="sữa, trứng, gluten" onChange={(allergens) => setFormData((prev) => ({ ...prev, allergens }))} /></div>
      </div>
    </FormSection>
  );
}

function CardIllustrationUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/wholesale/uploads/cloudinary", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Không thể tải ảnh minh họa.");
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh minh họa.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-neutral-700">Ảnh minh họa thẻ</div>
      {value ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"><ProductImage src={value} alt="Ảnh minh họa thẻ" /><button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-red-600 shadow-sm"><X className="h-4 w-4" /></button></div>
      ) : (
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center text-xs font-bold text-neutral-500 transition hover:border-brand-300 hover:bg-brand-50/40"><ImagePlus className="h-6 w-6" /><span className="mt-2">Tải ảnh minh họa</span><input type="file" accept="image/*" onChange={upload} className="sr-only" /></label>
      )}
      {value && <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50">{isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}Đổi ảnh<input type="file" accept="image/*" onChange={upload} disabled={isUploading} className="sr-only" /></label>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ProductImageUploader({
  formData,
  setFormData,
  className,
  compact = false,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  className?: string;
  compact?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const images = getProductImages(formData);

  const updateImages = (nextImages: string[]) => {
    const uniqueImages = Array.from(new Set(nextImages.filter(Boolean)));
    setFormData((prev) => ({
      ...prev,
      imageUrl: uniqueImages[0] ?? "",
      galleryImages: uniqueImages.slice(1).join(", "),
    }));
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/wholesale/uploads/cloudinary", {
          method: "POST",
          body,
        });
        const result = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !result.url) {
          throw new Error(result.error ?? "Không thể tải ảnh lên Cloudinary.");
        }

        uploadedUrls.push(result.url);
      }

      updateImages([...images, ...uploadedUrls]);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Không thể tải ảnh lên Cloudinary.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className={clsx("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-neutral-700">
            Ảnh sản phẩm <span className="text-red-600">*</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Tải nhiều ảnh lên Cloudinary. Ảnh đầu tiên là ảnh chính.
          </p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-100">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {isUploading ? "Đang tải..." : "Chọn ảnh"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={uploadFiles}
            className="sr-only"
          />
        </label>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {uploadError}
        </div>
      )}

      {images.length > 0 ? (
        <div className={clsx("grid gap-2.5", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2")}>
          {images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className={clsx(
                "group relative aspect-square overflow-hidden rounded-lg border bg-neutral-50",
                index === 0 ? "border-brand-400" : "border-neutral-200",
              )}
            >
              <ProductImage src={imageUrl} alt={`Ảnh sản phẩm ${index + 1}`} />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-3 w-3 fill-current" />
                  Chính
                </span>
              )}
              <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateImages([
                        imageUrl,
                        ...images.filter((item) => item !== imageUrl),
                      ])
                    }
                    className="flex h-7 flex-1 items-center justify-center rounded-md bg-white/95 text-[10px] font-bold text-neutral-800 shadow-sm"
                  >
                    Đặt chính
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateImages(images.filter((item) => item !== imageUrl))
                  }
                  className="grid h-7 w-7 place-items-center rounded-md bg-white/95 text-red-600 shadow-sm"
                  aria-label="Xóa ảnh"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <label className={clsx("flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-4 text-center transition hover:border-brand-300 hover:bg-brand-50/40", compact ? "min-h-[112px]" : "min-h-[180px]")}>
          <ImagePlus className="h-7 w-7 text-neutral-400" />
          <span className="mt-2 text-sm font-semibold text-neutral-700">
            Tải ảnh sản phẩm
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            Ảnh đầu tiên là ảnh chính.
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={uploadFiles}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

function getProductImages(formData: ProductFormData) {
  return Array.from(
    new Set([formData.imageUrl, ...splitTags(formData.galleryImages)].filter(Boolean)),
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium text-neutral-700">Danh mục <span className="text-red-600">*</span></legend>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button key={category.id} type="button" onClick={() => onChange(category.id)} className={clsx("flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-bold transition", value === category.id ? "border-brand-500 bg-brand-50 text-brand-800" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300")}>
            <span className="h-7 w-7 overflow-hidden rounded-md bg-neutral-100"><ProductImage src={category.iconUrl} alt="" /></span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function StorefrontPreview({ formData }: { formData: ProductFormData }) {
  return (
    <aside className="self-start">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Xem trước thẻ trang chủ</p>
      <div className="w-[160px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="aspect-[5/4] overflow-hidden bg-neutral-100"><ProductImage src={formData.imageUrl} alt={formData.displayName || formData.name || "Sản phẩm"} className="transition-transform duration-300" /></div>
        <div className="p-2"><p className="min-h-10 line-clamp-2 text-[13px] font-medium text-neutral-900">{formData.displayName || formData.name || "Tên sản phẩm"}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[14px] font-bold text-primary-600">{formatCurrency(formData.price)}</span><span className="rounded-md bg-brand-500 px-2 py-1 text-[11px] font-bold text-white">Thêm</span></div></div>
      </div>
    </aside>
  );
}

function SocialMetadataPreview({ formData }: { formData: ProductFormData }) {
  const title = formData.socialTitle.trim() || formData.displayName.trim() || formData.name.trim() || "Tên sản phẩm";
  const description = formData.socialDescription.trim() || formData.shortDescription.trim() || formData.description.trim() || "Mô tả sản phẩm sẽ xuất hiện khi chia sẻ liên kết.";
  const imageUrl = formData.socialImageUrl.trim() || formData.imageUrl;
  const url = "bakery.printz.vn/san-pham/...";

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-sm font-bold text-neutral-900">Preview khi crawler lấy Open Graph</h3><p className="mt-1 text-xs leading-5 text-neutral-500">Các giá trị này được dùng thật trong metadata của trang sản phẩm (Facebook, Zalo, Messenger và Twitter), không phải placeholder.</p></div><span className="text-[11px] font-bold text-emerald-700">Open Graph đang dùng</span></div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Bình luận Facebook</p><div className="rounded-xl border border-neutral-200 bg-white p-3"><div className="flex gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-black text-white">PH</span><div className="min-w-0"><p className="text-sm font-bold text-neutral-900">Đặng Hoàn Phúc <span className="font-normal text-neutral-400">· Vừa xong</span></p><p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-700">{description} <span className="text-blue-600">https://{url}</span></p><div className="mt-2 flex overflow-hidden rounded-xl border border-neutral-200"><div className="h-20 w-24 shrink-0 bg-neutral-100"><ProductImage src={imageUrl} alt="Preview Facebook" /></div><div className="min-w-0 p-2"><p className="line-clamp-1 text-sm font-bold text-neutral-900">{title}</p><p className="mt-1 text-xs text-neutral-500">bakery.printz.vn</p></div></div></div></div></div></div>
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Tin nhắn Zalo / Messenger</p><div className="overflow-hidden rounded-xl border border-sky-200 bg-[#e9f4ff]"><p className="line-clamp-2 px-3 pb-2 pt-3 text-base font-semibold leading-5 text-neutral-900">{title}</p><div className="aspect-[1.91/1] bg-neutral-100"><ProductImage src={imageUrl} alt="Preview Zalo" /></div><div className="p-3"><p className="text-xs text-sky-700">bakery.printz.vn</p><p className="mt-1 line-clamp-1 text-sm font-bold text-neutral-900">{title}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">{description}</p></div></div></div>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function VariantSection({
  formData,
  addSizeOption,
  updateSizeOption,
  removeSizeOption,
  addFlavorOption,
  updateFlavorOption,
  removeFlavorOption,
  generateVariantCombinations,
  updateVariantCombination,
}: {
  formData: ProductFormData;
  addSizeOption: () => void;
  updateSizeOption: (
    index: number,
    field: keyof SizeOption,
    value: string | number,
  ) => void;
  removeSizeOption: (index: number) => void;
  addFlavorOption: () => void;
  updateFlavorOption: (index: number, field: keyof FlavorOption, value: string | number) => void;
  removeFlavorOption: (index: number) => void;
  generateVariantCombinations: () => void;
  updateVariantCombination: (
    id: string,
    field: keyof ProductVariantCombination,
    value: string | number | boolean,
  ) => void;
}) {
  const canGenerateCombinations =
    formData.sizeOptions.length > 0 && formData.flavorOptions.length > 0;

  return (
    <FormSection title="Biến thể sản phẩm">
      <div className="space-y-6">
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">Size và vị/nhân là biến thể độc lập mặc định. Chỉ tạo tổ hợp Size × Vị khi mỗi cặp là một sản phẩm bán và quét mã riêng. Giá thêm được cộng vào giá niêm yết.</p>

        <section>
          <OptionHeader label="Kích thước" onAdd={addSizeOption} />
          <div className="mt-2 space-y-2">
            {formData.sizeOptions.map((size, index) => (
              <div key={size.id} className="grid grid-cols-[minmax(0,1fr)_130px_40px] gap-2">
                <input type="text" placeholder="Ví dụ: 16cm, 20cm" value={size.label} onChange={(event) => updateSizeOption(index, "label", event.target.value)} className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                <input type="number" min={0} placeholder="Giá thêm" value={size.priceAdjustment} onChange={(event) => updateSizeOption(index, "priceAdjustment", Number(event.target.value) || 0)} className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                <IconButton label="Xóa kích thước" onClick={() => removeSizeOption(index)} />
              </div>
            ))}
            {formData.sizeOptions.length === 0 && <EmptyHint text="Không dùng size riêng thì để trống; sản phẩm sẽ dùng giá niêm yết." />}
          </div>
        </section>

        <section>
          <OptionHeader label="Vị / nhân bánh" onAdd={addFlavorOption} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {formData.flavorOptions.map((flavor, index) => (
              <div key={flavor.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
                <div className="w-20 shrink-0"><FlavorImageUploader flavor={flavor} onChange={(imageUrl) => updateFlavorOption(index, "imageUrl", imageUrl)} /></div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input type="text" placeholder="Ví dụ: Socola, Matcha" value={flavor.label} onChange={(event) => updateFlavorOption(index, "label", event.target.value)} className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500" />
                  <input type="number" min={0} placeholder="Giá thêm cho vị" value={flavor.priceAdjustment ?? 0} onChange={(event) => updateFlavorOption(index, "priceAdjustment", Number(event.target.value) || 0)} className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500" />
                  <button type="button" onClick={() => removeFlavorOption(index)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 className="h-3.5 w-3.5" /> Xóa vị</button>
                </div>
              </div>
            ))}
            {formData.flavorOptions.length === 0 && <EmptyHint text="Không dùng vị riêng thì để trống." />}
          </div>
        </section>

        {canGenerateCombinations && (
          <section className="border-t border-neutral-200 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-sm font-bold text-neutral-900">Tổ hợp Size × Vị <span className="ml-1 text-xs font-medium text-neutral-400">(tuỳ chọn)</span></h3><p className="mt-1 text-xs text-neutral-500">Chỉ dùng khi từng cặp Size × Vị là một biến thể bán độc lập. Dữ liệu tổ hợp cũ được giữ nguyên.</p></div>
              <button type="button" onClick={generateVariantCombinations} className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-xs font-bold text-white transition hover:bg-neutral-700"><Plus className="h-3.5 w-3.5" /> Tạo tổ hợp bán riêng</button>
            </div>
            {formData.variantCombinations.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-[460px] w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2.5">Tổ hợp</th><th className="px-3 py-2.5">Giá thêm</th><th className="px-3 py-2.5">Tồn</th><th className="px-3 py-2.5">Bán</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {formData.variantCombinations.map((combination) => {
                      const size = formData.sizeOptions.find((item) => item.id === combination.sizeOptionId);
                      const flavor = formData.flavorOptions.find((item) => item.id === combination.flavorOptionId);
                      if (!size || !flavor) return null;
                      return <tr key={combination.id}><td className="px-3 py-2.5 font-semibold text-neutral-800">{size.label || "Size"} <span className="text-neutral-400">×</span> {flavor.label || "Vị"}</td><td className="px-3 py-2"><input type="number" min={0} value={combination.priceAdjustment ?? 0} onChange={(event) => updateVariantCombination(combination.id, "priceAdjustment", Number(event.target.value) || 0)} className="h-8 w-28 rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-brand-500" /></td><td className="px-3 py-2"><input type="number" min={0} value={combination.stock ?? 0} onChange={(event) => updateVariantCombination(combination.id, "stock", Number(event.target.value) || 0)} className="h-8 w-20 rounded-md border border-neutral-300 px-2 text-sm outline-none focus:border-brand-500" /></td><td className="px-3 py-2"><input type="checkbox" checked={combination.isAvailable ?? true} onChange={(event) => updateVariantCombination(combination.id, "isAvailable", event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" aria-label={`Bán ${size.label} ${flavor.label}`} /></td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : <EmptyHint text="Chưa có tổ hợp. Bấm “Tạo tổ hợp” sau khi đã nhập size và vị." />}
          </section>
        )}
      </div>
    </FormSection>
  );
}

function FlavorImageUploader({ flavor, onChange }: { flavor: FlavorOption; onChange: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/wholesale/uploads/cloudinary", { method: "POST", body });
      const result = await response.json() as { url?: string };
      if (response.ok && result.url) onChange(result.url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }
  return flavor.imageUrl ? (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
      <ProductImage src={flavor.imageUrl} alt={flavor.label || "Ảnh vị bánh"} className="object-cover" />
      <button type="button" onClick={() => onChange("")} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-red-600 shadow"><X className="h-3.5 w-3.5" /></button>
    </div>
  ) : (
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-center text-[10px] font-bold text-neutral-500">
      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
      <span className="mt-1">Tải ảnh vị</span>
      <input type="file" accept="image/*" onChange={upload} className="sr-only" />
    </label>
  );
}

export function OperationsSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Kênh bán & vận hành">
      <div className="grid gap-3">
        <ToggleRow
          label="Đang bán"
          checked={formData.isAvailable}
          onChange={(isAvailable) =>
            setFormData((prev) => ({ ...prev, isAvailable }))
          }
        />
        <ToggleRow
          label="Cho phép giao tận nơi"
          checked={formData.availableForDelivery}
          onChange={(availableForDelivery) =>
            setFormData((prev) => ({ ...prev, availableForDelivery }))
          }
        />
        <ToggleRow
          label="Cho phép đến quán lấy"
          checked={formData.availableForPickup}
          onChange={(availableForPickup) =>
            setFormData((prev) => ({ ...prev, availableForPickup }))
          }
        />
        <ToggleRow
          label="Có sẵn hôm nay"
          checked={formData.availableToday}
          onChange={(availableToday) =>
            setFormData((prev) => ({ ...prev, availableToday }))
          }
        />
        <ToggleRow
          label="Cần đặt trước"
          checked={formData.requiresPreorder}
          onChange={(requiresPreorder) =>
            setFormData((prev) => ({ ...prev, requiresPreorder }))
          }
        />
        <ToggleRow
          label="Cho nhập lời chúc trên bánh"
          checked={formData.requiresMessage}
          onChange={(requiresMessage) =>
            setFormData((prev) => ({ ...prev, requiresMessage }))
          }
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <NumberField
          label="Chuẩn bị (phút)"
          min={0}
          value={formData.preparationTimeMinutes}
          onChange={(preparationTimeMinutes) =>
            setFormData((prev) => ({ ...prev, preparationTimeMinutes }))
          }
        />
        <NumberField
          label="Đặt trước (giờ)"
          min={0}
          value={formData.preorderMinHours}
          onChange={(preorderMinHours) =>
            setFormData((prev) => ({ ...prev, preorderMinHours }))
          }
        />
        <NumberField
          label="Ưu tiên hiển thị"
          value={formData.sortPriority}
          onChange={(sortPriority) =>
            setFormData((prev) => ({ ...prev, sortPriority }))
          }
        />
        <NumberField
          label="Tồn bán trong ngày"
          min={0}
          value={formData.dailyStock}
          onChange={(dailyStock) =>
            setFormData((prev) => ({ ...prev, dailyStock }))
          }
        />
        <TextField
          label="Bán từ (HH:mm)"
          value={formData.availableFrom}
          onChange={(availableFrom) =>
            setFormData((prev) => ({ ...prev, availableFrom }))
          }
        />
        <TextField
          label="Bán đến (HH:mm)"
          value={formData.availableUntil}
          onChange={(availableUntil) =>
            setFormData((prev) => ({ ...prev, availableUntil }))
          }
        />
        <TextField
          label="Khẩu phần"
          value={formData.servingSize}
          onChange={(servingSize) =>
            setFormData((prev) => ({ ...prev, servingSize }))
          }
        />
        <NumberField
          label="Ranking boost"
          value={formData.rankingBoost}
          onChange={(rankingBoost) =>
            setFormData((prev) => ({ ...prev, rankingBoost }))
          }
        />
      </div>
      <label className="mt-3 block text-sm font-semibold text-neutral-700">
        Độ ngọt
        <select
          value={formData.sweetnessLevel}
          onChange={(event) => setFormData((prev) => ({ ...prev, sweetnessLevel: event.target.value as ProductFormData["sweetnessLevel"] }))}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="low">Ít ngọt</option>
          <option value="medium">Vừa</option>
          <option value="high">Ngọt</option>
        </select>
      </label>
    </FormSection>
  );
}

export function CostingSection({
  formData,
  setFormData,
  productId,
  costingSummary,
  showRecipeDetails = true,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  productId?: string | null;
  costingSummary?: ProductCostSummary | null;
  showRecipeDetails?: boolean;
}) {
  const { costWithWaste, grossProfit, grossMargin } = getCostSnapshot(formData, costingSummary);
  const costingHref = productId
    ? `/wholesale/finance/costing?productId=${productId}`
    : "/wholesale/finance/costing";

  return (
    <FormSection title="Giá vốn & lợi nhuận">
      {costingSummary?.source === "recipe" && costingSummary.recipe ? (
        showRecipeDetails ? (
        <div className="mb-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-emerald-900">
                Nguồn: BOM active · v{costingSummary.recipe.version}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Cost tự tính từ công thức + giá nguyên liệu. Không nhập tay trên form này.
              </p>
            </div>
            <Link
              href={costingHref}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Sửa công thức
            </Link>
          </div>
          <ul className="space-y-1.5 text-sm text-emerald-950">
            {costingSummary.recipe.lines.map((line) => (
              <li
                key={`${line.ingredientId}-${line.quantity}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-2.5 py-1.5"
              >
                <span className="font-semibold">{line.ingredientName}</span>
                <span className="shrink-0 text-xs font-bold text-emerald-800">
                  {line.quantity} {unitLabel(line.baseUnit)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-emerald-800">
            Yield {costingSummary.recipe.yieldQuantity} · Hao hụt{" "}
            {(costingSummary.recipe.wasteBasisPoints / 100).toFixed(1)}%
          </p>
          <div className="grid gap-2 rounded-lg bg-white/80 p-3 text-sm md:grid-cols-2">
            <CostMetric label="NL / SP (BOM)" value={costingSummary.unitCost.ingredientCost} />
            <CostMetric label="Bao bì / SP" value={costingSummary.unitCost.packagingCost} />
            <CostMetric label="Công / SP" value={costingSummary.unitCost.directLaborCost} />
            <CostMetric label="Overhead / SP" value={costingSummary.unitCost.overheadCost} />
          </div>
        </div>
        ) : null
      ) : (
        <div className="mb-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-amber-950">
                Chưa có BOM active — đang dùng giá vốn nhập tay (legacy)
              </p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                Nên lập công thức định lượng ở Giá thành để cost tự cập nhật theo giá nguyên liệu.
              </p>
            </div>
            <Link
              href={costingHref}
              className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-900"
            >
              Lập BOM
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              label="Nguyên liệu / sản phẩm"
              min={0}
              value={formData.ingredientsCost}
              onChange={(ingredientsCost) =>
                setFormData((prev) => ({ ...prev, ingredientsCost }))
              }
            />
            <NumberField
              label="Bao bì"
              min={0}
              value={formData.packagingCost}
              onChange={(packagingCost) =>
                setFormData((prev) => ({ ...prev, packagingCost }))
              }
            />
            <NumberField
              label="Công làm ước tính"
              min={0}
              value={formData.laborCost}
              onChange={(laborCost) =>
                setFormData((prev) => ({ ...prev, laborCost }))
              }
            />
            <NumberField
              label="Chi phí chung phân bổ"
              min={0}
              value={formData.overheadCost}
              onChange={(overheadCost) =>
                setFormData((prev) => ({ ...prev, overheadCost }))
              }
            />
            <NumberField
              label="Hao hụt (%)"
              min={0}
              value={formData.wastePercent}
              onChange={(wastePercent) =>
                setFormData((prev) => ({ ...prev, wastePercent }))
              }
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          label="Biên lời mục tiêu (%)"
          min={0}
          value={formData.targetGrossMarginPercent}
          onChange={(targetGrossMarginPercent) =>
            setFormData((prev) => ({ ...prev, targetGrossMarginPercent }))
          }
        />
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-neutral-50 p-3 text-sm md:grid-cols-3">
        <CostMetric label="Giá vốn ước tính" value={costWithWaste} />
        <CostMetric label="Lãi gộp / sản phẩm" value={grossProfit} />
        <div>
          <div className="text-xs font-semibold text-neutral-500">Biên lãi</div>
          <div className="mt-1 text-lg font-black text-neutral-950">
            {grossMargin}%
          </div>
        </div>
      </div>
    </FormSection>
  );
}

function getCostSnapshot(
  formData: ProductFormData,
  costingSummary?: ProductCostSummary | null,
) {
  const hasBom = costingSummary?.source === "recipe";
  const manualCost = formData.ingredientsCost + formData.packagingCost + formData.laborCost + formData.overheadCost;
  const costWithWaste = hasBom
    ? costingSummary.totalCost
    : Math.round(manualCost * (1 + Math.max(0, formData.wastePercent) / 100));
  const grossProfit = Math.max(0, formData.price - costWithWaste);
  const grossMargin = formData.price > 0 ? Math.round((grossProfit / formData.price) * 1000) / 10 : 0;
  const targetMargin = Math.min(99, Math.max(0, formData.targetGrossMarginPercent));
  const recommendedPrice = targetMargin >= 100 ? 0 : Math.ceil(costWithWaste / Math.max(0.01, 1 - targetMargin / 100));
  return { hasBom, costWithWaste, grossProfit, grossMargin, recommendedPrice };
}

export function FinancePerformanceSection({
  formData,
  setFormData,
  costingSummary,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  costingSummary?: ProductCostSummary | null;
}) {
  const { costWithWaste, grossProfit, grossMargin, recommendedPrice } = getCostSnapshot(formData, costingSummary);
  const meetsTarget = grossMargin >= formData.targetGrossMarginPercent;
  return (
    <FormSection title="Hiệu quả trên một sản phẩm">
      <div className="grid gap-3 sm:grid-cols-3"><FinanceMetric label="Giá bán niêm yết" value={formatCurrency(formData.price)} tone="blue" /><FinanceMetric label="Tổng giá vốn (COGS)" value={formatCurrency(costWithWaste)} tone="neutral" /><FinanceMetric label="Lợi nhuận gộp" value={formatCurrency(grossProfit)} tone={meetsTarget ? "blue" : "danger"} /></div>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><NumberField label="Biên lợi nhuận mục tiêu (%)" min={0} value={formData.targetGrossMarginPercent} onChange={(targetGrossMarginPercent) => setFormData((prev) => ({ ...prev, targetGrossMarginPercent }))} /><div className={clsx("rounded-lg border px-3 py-2.5", meetsTarget ? "border-blue-100 bg-blue-50/70" : "border-red-100 bg-red-50/70")}><p className="text-xs font-semibold text-neutral-500">Biên hiện tại</p><p className={clsx("mt-1 text-xl font-black", meetsTarget ? "text-blue-700" : "text-red-700")}>{grossMargin}%</p><p className="mt-1 text-xs leading-5 text-neutral-600">{meetsTarget ? "Đạt mục tiêu biên lợi nhuận." : `Để đạt mục tiêu, giá bán cần khoảng ${formatCurrency(recommendedPrice)}.`}</p></div></div>
      <p className="mt-3 text-xs text-neutral-500">Giá bán được quản lý tại Bán hàng; phần này chỉ theo dõi hiệu quả và ngưỡng lợi nhuận.</p>
    </FormSection>
  );
}

export function FinanceCostSourceSection({
  formData,
  setFormData,
  costingSummary,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  costingSummary?: ProductCostSummary | null;
}) {
  if (costingSummary?.source === "recipe" && costingSummary.recipe) {
    return <FormSection title="Nguồn giá vốn"><div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3"><p className="text-sm font-black text-blue-950">Đang lấy từ BOM v{costingSummary.recipe.version}</p><p className="mt-1 text-xs leading-5 text-blue-900/80">Giá vốn được tính từ công thức đang kích hoạt, giá nguyên liệu và hao hụt. Chỉnh ở sheet Sản xuất & BOM để tạo phiên bản mới.</p><div className="mt-3 grid gap-2 rounded-lg bg-white/80 p-3 text-sm md:grid-cols-2"><CostMetric label="Nguyên liệu / SP" value={costingSummary.unitCost.ingredientCost} /><CostMetric label="Bao bì / SP" value={costingSummary.unitCost.packagingCost} /><CostMetric label="Nhân công / SP" value={costingSummary.unitCost.directLaborCost} /><CostMetric label="Overhead / SP" value={costingSummary.unitCost.overheadCost} /></div></div></FormSection>;
  }
  return <FormSection title="Nguồn giá vốn tạm tính"><div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-900">Chưa có BOM kích hoạt. Các số dưới đây là dữ liệu legacy, chỉ dùng tạm đến khi tạo BOM ở sheet Sản xuất.</div><div className="grid gap-3 md:grid-cols-2"><NumberField label="Nguyên liệu / sản phẩm" min={0} value={formData.ingredientsCost} onChange={(ingredientsCost) => setFormData((prev) => ({ ...prev, ingredientsCost }))} /><NumberField label="Bao bì" min={0} value={formData.packagingCost} onChange={(packagingCost) => setFormData((prev) => ({ ...prev, packagingCost }))} /><NumberField label="Nhân công ước tính" min={0} value={formData.laborCost} onChange={(laborCost) => setFormData((prev) => ({ ...prev, laborCost }))} /><NumberField label="Chi phí chung phân bổ" min={0} value={formData.overheadCost} onChange={(overheadCost) => setFormData((prev) => ({ ...prev, overheadCost }))} /><NumberField label="Hao hụt (%)" min={0} value={formData.wastePercent} onChange={(wastePercent) => setFormData((prev) => ({ ...prev, wastePercent }))} /></div></FormSection>;
}

function unitLabel(unit: "gram" | "millilitre" | "each") {
  if (unit === "gram") return "g";
  if (unit === "millilitre") return "ml";
  return "cái";
}

export function DisplayLabelsSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Nhãn hiển thị">
      <div className="grid gap-3">
        <ToggleRow
          label="Sản phẩm nổi bật"
          checked={formData.isFeatured}
          onChange={(isFeatured) =>
            setFormData((prev) => ({ ...prev, isFeatured }))
          }
        />
        <ToggleRow
          label="Sản phẩm mới"
          checked={formData.isNew}
          onChange={(isNew) => setFormData((prev) => ({ ...prev, isNew }))}
        />
        <ToggleRow
          label="Bán chạy"
          checked={formData.isBestseller}
          onChange={(isBestseller) =>
            setFormData((prev) => ({ ...prev, isBestseller }))
          }
        />
      </div>
    </FormSection>
  );
}

export function MetadataSection({
  formData,
  setFormData,
  assistantNote,
  onApplyAssistant,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  assistantNote: string | null;
  onApplyAssistant: () => void;
}) {
  return (
    <FormSection
      title="Search, filter & trợ lý AI"
      action={
        <button
          type="button"
          onClick={onApplyAssistant}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          <Bot className="h-3.5 w-3.5" />
          Gợi ý AI
        </button>
      }
    >
      <div className="space-y-3">
        {assistantNote && (
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
            {assistantNote}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="Khẩu phần gợi ý"
            value={formData.servingSuggestion}
            onChange={(servingSuggestion) =>
              setFormData((prev) => ({ ...prev, servingSuggestion }))
            }
          />
          <TagInput
            label="Điểm bán hàng nổi bật"
            value={formData.sellingPoints}
            placeholder="Làm mới sau khi đặt, kem cheese nhập khẩu"
            onChange={(sellingPoints) =>
              setFormData((prev) => ({ ...prev, sellingPoints }))
            }
          />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-3 text-xs font-bold uppercase text-neutral-500">
            Metadata chia sẻ mạng xã hội
          </p>
          <div className="space-y-3">
            <TextField
              label="Tiêu đề khi chia sẻ"
              value={formData.socialTitle}
              onChange={(socialTitle) =>
                setFormData((prev) => ({ ...prev, socialTitle }))
              }
            />
            <TextAreaField
              label="Mô tả chào hàng"
              value={formData.socialDescription}
              onChange={(socialDescription) =>
                setFormData((prev) => ({ ...prev, socialDescription }))
              }
            />
            <TextField
              label="Ảnh social riêng"
              value={formData.socialImageUrl}
              onChange={(socialImageUrl) =>
                setFormData((prev) => ({ ...prev, socialImageUrl }))
              }
            />
            <TagInput
              label="Hashtag"
              value={formData.socialHashtags}
              placeholder="banhsinhnhat, bakery, giaohomnay"
              onChange={(socialHashtags) =>
                setFormData((prev) => ({ ...prev, socialHashtags }))
              }
            />
          </div>
        </div>
        <TagInput
          label="Tag sản phẩm"
          value={formData.tags}
          placeholder="socola, bánh nướng, ghi lời chúc"
          onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
        />
        <TagInput
          label="Thành phần"
          value={formData.ingredients}
          placeholder="bột mì, trứng, bơ, sữa"
          onChange={(ingredients) =>
            setFormData((prev) => ({ ...prev, ingredients }))
          }
        />
        <TagInput
          label="Dịp sử dụng"
          value={formData.occasionTags}
          placeholder="sinh nhật, kỷ niệm, tiệc công ty"
          onChange={(occasionTags) =>
            setFormData((prev) => ({ ...prev, occasionTags }))
          }
        />
        <TagInput
          label="Chế độ ăn"
          value={formData.dietaryTags}
          placeholder="ít ngọt, healthy, keto, vegan"
          onChange={(dietaryTags) =>
            setFormData((prev) => ({ ...prev, dietaryTags }))
          }
        />
        <TagInput
          label="Dị ứng"
          value={formData.allergens}
          placeholder="sữa, trứng, gluten, hạt"
          onChange={(allergens) =>
            setFormData((prev) => ({ ...prev, allergens }))
          }
        />
        <TextField
          label="Hạn dùng"
          value={formData.shelfLife}
          onChange={(shelfLife) =>
            setFormData((prev) => ({ ...prev, shelfLife }))
          }
        />
        <TextAreaField
          label="Bảo quản"
          value={formData.storage}
          onChange={(storage) => setFormData((prev) => ({ ...prev, storage }))}
        />
        <TagInput
          label="Khu vực bán"
          value={formData.saleArea}
          placeholder="Buôn Ma Thuột, Đắk Lắk, Tây Nguyên"
          onChange={(saleArea) =>
            setFormData((prev) => ({ ...prev, saleArea }))
          }
        />
        <TagInput
          label="Từ khóa tìm kiếm"
          value={formData.searchKeywords}
          placeholder="bánh sinh nhật, giao hôm nay, quà tặng"
          onChange={(searchKeywords) =>
            setFormData((prev) => ({ ...prev, searchKeywords }))
          }
        />
        <TagInput
          label="Chi nhánh nhận tại quán"
          value={formData.pickupBranchIds}
          placeholder="main-store, district-1"
          onChange={(pickupBranchIds) =>
            setFormData((prev) => ({ ...prev, pickupBranchIds }))
          }
        />
      </div>
    </FormSection>
  );
}

export function MarketingMetadataSection({
  formData,
  setFormData,
  assistantNote,
  onApplyAssistant,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  assistantNote: string | null;
  onApplyAssistant: () => void;
}) {
  return (
    <FormSection
      title="Nội dung & khám phá sản phẩm"
      action={<button type="button" onClick={onApplyAssistant} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"><Bot className="h-3.5 w-3.5" />Gợi ý AI</button>}
    >
      <div className="space-y-3">
        {assistantNote && <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">{assistantNote}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Khẩu phần gợi ý" value={formData.servingSuggestion} onChange={(servingSuggestion) => setFormData((prev) => ({ ...prev, servingSuggestion }))} />
          <TagInput label="Điểm bán hàng nổi bật" value={formData.sellingPoints} placeholder="Làm mới sau khi đặt, kem cheese nhập khẩu" onChange={(sellingPoints) => setFormData((prev) => ({ ...prev, sellingPoints }))} />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-3 text-xs font-bold uppercase text-neutral-500">Metadata chia sẻ mạng xã hội</p>
          <div className="space-y-3">
            <TextField label="Tiêu đề khi chia sẻ" value={formData.socialTitle} onChange={(socialTitle) => setFormData((prev) => ({ ...prev, socialTitle }))} />
            <TextAreaField label="Mô tả chào hàng" value={formData.socialDescription} onChange={(socialDescription) => setFormData((prev) => ({ ...prev, socialDescription }))} />
            <TextField label="Ảnh social riêng" value={formData.socialImageUrl} onChange={(socialImageUrl) => setFormData((prev) => ({ ...prev, socialImageUrl }))} />
            <TagInput label="Hashtag" value={formData.socialHashtags} placeholder="banhsinhnhat, bakery, giaohomnay" onChange={(socialHashtags) => setFormData((prev) => ({ ...prev, socialHashtags }))} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TagInput label="Tag sản phẩm" value={formData.tags} placeholder="socola, bánh nướng" onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))} />
          <TagInput label="Dịp sử dụng" value={formData.occasionTags} placeholder="sinh nhật, kỷ niệm" onChange={(occasionTags) => setFormData((prev) => ({ ...prev, occasionTags }))} />
          <TagInput label="Chế độ ăn" value={formData.dietaryTags} placeholder="ít ngọt, keto, vegan" onChange={(dietaryTags) => setFormData((prev) => ({ ...prev, dietaryTags }))} />
          <TagInput label="Từ khóa tìm kiếm" value={formData.searchKeywords} placeholder="bánh sinh nhật, giao hôm nay" onChange={(searchKeywords) => setFormData((prev) => ({ ...prev, searchKeywords }))} />
          <TagInput label="Thành phần hiển thị" value={formData.ingredients} placeholder="bột mì, trứng, bơ" onChange={(ingredients) => setFormData((prev) => ({ ...prev, ingredients }))} />
          <TagInput label="Dị ứng" value={formData.allergens} placeholder="sữa, trứng, gluten" onChange={(allergens) => setFormData((prev) => ({ ...prev, allergens }))} />
        </div>
      </div>
    </FormSection>
  );
}

export function LogisticsSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return (
    <FormSection title="Mã hàng, tồn kho & bảo quản">
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="SKU gốc" placeholder="VD: BK-CAKE-001" value={formData.sku} onChange={(sku) => setFormData((prev) => ({ ...prev, sku }))} />
        <TextField label="Barcode" placeholder="VD: 8931234567890" value={formData.barcode} onChange={(barcode) => setFormData((prev) => ({ ...prev, barcode }))} />
        <NumberField label="Tồn kho khả dụng" min={0} value={formData.stock} onChange={(stock) => setFormData((prev) => ({ ...prev, stock }))} />
        <NumberField label="Tồn bán trong ngày" min={0} value={formData.dailyStock} onChange={(dailyStock) => setFormData((prev) => ({ ...prev, dailyStock }))} />
        <TextField label="Hạn sử dụng" value={formData.shelfLife} onChange={(shelfLife) => setFormData((prev) => ({ ...prev, shelfLife }))} />
        <TagInput label="Chi nhánh nhận tại quán" value={formData.pickupBranchIds} placeholder="main-store, district-1" onChange={(pickupBranchIds) => setFormData((prev) => ({ ...prev, pickupBranchIds }))} />
        <TextAreaField label="Bảo quản" value={formData.storage} onChange={(storage) => setFormData((prev) => ({ ...prev, storage }))} className="md:col-span-2" />
        <TagInput label="Khu vực bán" value={formData.saleArea} placeholder="Buôn Ma Thuột, Đắk Lắk" onChange={(saleArea) => setFormData((prev) => ({ ...prev, saleArea }))} className="md:col-span-2" />
      </div>
    </FormSection>
  );
}

type LedgerBalanceRow = InventoryBalance & { id: string };

export function LogisticsInventorySection({
  productId,
  legacyStock,
}: {
  productId: string;
  legacyStock: number;
}) {
  const [balances, setBalances] = useState<LedgerBalanceRow[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [balanceResponse, movementResponse] = await Promise.all([
          fetch(`/api/wholesale/finance/inventory/balances?itemType=product&itemId=${encodeURIComponent(productId)}`, { cache: "no-store" }),
          fetch(`/api/wholesale/finance/inventory/movements?itemType=product&itemId=${encodeURIComponent(productId)}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const allBalances = balanceResponse.ok ? await balanceResponse.json() as LedgerBalanceRow[] : [];
        setBalances(allBalances.filter((balance) => balance.itemType === "product" && balance.itemId === productId));
        setMovements(movementResponse.ok ? await movementResponse.json() as InventoryMovement[] : []);
      } catch {
        if (!cancelled) {
          setBalances([]);
          setMovements([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [productId]);

  const ledgerQuantity = balances.reduce((total, balance) => total + Number(balance.quantity || 0), 0);
  const hasLedger = balances.length > 0;
  return <FormSection title="Tồn kho & lịch sử"><div className={clsx("rounded-xl border p-3", hasLedger ? "border-teal-100 bg-teal-50/70" : "border-amber-200 bg-amber-50/70")}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-neutral-500">{hasLedger ? "Tồn khả dụng theo sổ kho" : "Chưa có sổ kho cho sản phẩm"}</p><p className={clsx("mt-1 text-2xl font-black", hasLedger ? "text-teal-800" : "text-amber-900")}>{isLoading ? "—" : `${hasLedger ? ledgerQuantity : legacyStock} đơn vị`}</p><p className="mt-1 text-xs leading-5 text-neutral-600">{hasLedger ? `${balances.length} vị trí kho đang ghi nhận. Số này được tạo từ nhập, sản xuất, bán và hao hụt.` : "Đang dùng tồn legacy của sản phẩm. Hãy tạo nhập kho hoặc hoàn tất mẻ sản xuất để khởi tạo sổ kho."}</p></div><Link href="/wholesale/finance/operations" className="inline-flex h-9 items-center rounded-lg border border-teal-200 bg-white px-3 text-xs font-bold text-teal-800 hover:bg-teal-50">Mở nghiệp vụ kho</Link></div></div><div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-neutral-900">30 biến động gần nhất</p><span className="text-xs text-neutral-400">Không chỉnh tồn trực tiếp tại đây</span></div>{isLoading ? <div className="py-8 text-center text-sm text-neutral-400">Đang tải lịch sử…</div> : movements.length > 0 ? <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">{movements.map((movement) => <div key={movement.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><div><p className="font-semibold text-neutral-800">{movementLabel(movement.type)}</p><p className="mt-0.5 text-xs text-neutral-400">{formatMovementDate(movement.occurredAt)} · {movement.locationId}</p></div><span className={movement.direction === "in" ? "font-bold text-teal-700" : "font-bold text-red-700"}>{movement.direction === "in" ? "+" : "−"}{movement.quantity}</span></div>)}</div> : <EmptyHint text="Chưa có biến động kho. Tồn chỉ được hình thành từ nhập, sản xuất, bán, hao hụt hoặc kiểm kê." />}</div></FormSection>;
}

export function LogisticsIdentitySection({
  formData,
  setFormData,
  assignMissingVariantIdentifiers,
  updateVariantCombination,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  assignMissingVariantIdentifiers: () => void;
  updateVariantCombination: (id: string, field: keyof ProductVariantCombination, value: string | number | boolean) => void;
}) {
  const createBaseIdentifiers = (replace = false) => {
    setFormData((prev) => ({
      ...prev,
      sku: replace || !prev.sku.trim() ? createProductSku({ itemType: prev.itemType, name: prev.name }) : prev.sku,
      barcode: replace || !prev.barcode.trim() ? createInternalBarcode() : prev.barcode,
    }));
  };

  useEffect(() => {
    assignMissingVariantIdentifiers();
  // Observe the sales options once when this tab mounts and only fill missing identifiers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <FormSection title="Mã nhận diện gốc">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm leading-6 text-neutral-500">Mã nội bộ được tạo tự động. Bạn vẫn có thể sửa khi cần; bấm tạo lại mới thay mã hiện có.</p>
          <button type="button" onClick={() => createBaseIdentifiers(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-800 transition hover:bg-teal-100"><RefreshCw className="h-3.5 w-3.5" /> Tạo lại mã gốc</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px]">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="SKU gốc" placeholder="VD: TP-BANH-MI-A2K8" value={formData.sku} onChange={(sku) => setFormData((prev) => ({ ...prev, sku }))} />
            <TextField label="Barcode nội bộ (EAN-13)" placeholder="VD: 2001234567890" value={formData.barcode} onChange={(barcode) => setFormData((prev) => ({ ...prev, barcode }))} />
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            <ProductImage src={formData.imageUrl} alt={formData.name || "Ảnh sản phẩm"} />
          </div>
        </div>
      </FormSection>
      <VariantIdentifierList formData={formData} setFormData={setFormData} assignMissingVariantIdentifiers={assignMissingVariantIdentifiers} updateVariantCombination={updateVariantCombination} />
    </div>
  );
}

type IdentifierVariantItem = {
  id: string;
  label: string;
  imageUrl: string;
  sku?: string;
  barcode?: string;
  onChange: (field: "sku" | "barcode", value: string) => void;
};

function VariantIdentifierList({
  formData,
  setFormData,
  assignMissingVariantIdentifiers,
  updateVariantCombination,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  assignMissingVariantIdentifiers: () => void;
  updateVariantCombination: (id: string, field: keyof ProductVariantCombination, value: string | number | boolean) => void;
}) {
  const updateOptionIdentifier = (axis: "sizeOptions" | "flavorOptions", id: string, field: "sku" | "barcode", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [axis]: prev[axis].map((option) => option.id === id ? { ...option, [field]: value } : option),
    }));
  };

  const items: IdentifierVariantItem[] = formData.variantCombinations.length > 0
    ? formData.variantCombinations.map((combination, index) => {
        const size = formData.sizeOptions.find((option) => option.id === combination.sizeOptionId);
        const flavor = formData.flavorOptions.find((option) => option.id === combination.flavorOptionId);
        return {
          id: combination.id,
          label: size && flavor ? `${size.label || "Size"} × ${flavor.label || "Vị"}` : `Tổ hợp ${index + 1}`,
          imageUrl: flavor?.imageUrl || size?.imageUrl || formData.imageUrl,
          sku: combination.sku,
          barcode: combination.barcode,
          onChange: (field, value) => updateVariantCombination(combination.id, field, value),
        };
      })
    : [
        ...formData.sizeOptions.map((size) => ({
          id: `size:${size.id}`,
          label: `Size · ${size.label || "Chưa đặt tên"}`,
          imageUrl: size.imageUrl || formData.imageUrl,
          sku: size.sku,
          barcode: size.barcode,
          onChange: (field: "sku" | "barcode", value: string) => updateOptionIdentifier("sizeOptions", size.id, field, value),
        })),
        ...formData.flavorOptions.map((flavor) => ({
          id: `flavor:${flavor.id}`,
          label: `Vị/nhân · ${flavor.label || "Chưa đặt tên"}`,
          imageUrl: flavor.imageUrl || formData.imageUrl,
          sku: flavor.sku,
          barcode: flavor.barcode,
          onChange: (field: "sku" | "barcode", value: string) => updateOptionIdentifier("flavorOptions", flavor.id, field, value),
        })),
      ];

  return (
    <FormSection title={formData.variantCombinations.length > 0 ? "Mã theo tổ hợp" : "Mã theo biến thể độc lập"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm leading-6 text-neutral-500">{formData.variantCombinations.length > 0 ? "Mỗi tổ hợp bán riêng có một SKU và barcode riêng." : "Mỗi Size hoặc Vị/nhân là một biến thể bán riêng, có ảnh và mã riêng."}</p>
          <p className="mt-1 text-xs text-neutral-400">Ảnh ưu tiên của biến thể; nếu chưa có sẽ dùng ảnh sản phẩm.</p>
        </div>
        <button type="button" onClick={assignMissingVariantIdentifiers} disabled={items.length === 0} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-3.5 w-3.5" /> Cấp mã còn thiếu</button>
      </div>
      {items.length > 0 ? <div className="mt-4 space-y-2">{items.map((item) => <article key={item.id} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[72px_minmax(0,1fr)]"><div className="h-[72px] overflow-hidden rounded-lg bg-neutral-100"><ProductImage src={item.imageUrl} alt={item.label} /></div><div className="min-w-0"><p className="font-bold text-neutral-900">{item.label}</p><div className="mt-2 grid gap-2 md:grid-cols-2"><TextField label="SKU biến thể" value={item.sku ?? ""} onChange={(value) => item.onChange("sku", value)} /><TextField label="Barcode biến thể" value={item.barcode ?? ""} onChange={(value) => item.onChange("barcode", value)} /></div></div></article>)}</div> : <EmptyHint text="Thêm Size hoặc Vị/nhân ở tab Biến thể. Chỉ tạo tổ hợp khi bạn thực sự bán từng cặp Size × Vị." />}
    </FormSection>
  );
}

export function LogisticsStorageSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  return <FormSection title="Bảo quản & phục vụ"><div className="grid gap-3 md:grid-cols-2"><TextField label="Hạn sử dụng theo chính sách" placeholder="Ví dụ: 3 ngày từ ngày sản xuất" value={formData.shelfLife} onChange={(shelfLife) => setFormData((prev) => ({ ...prev, shelfLife }))} /><TagInput label="Chi nhánh nhận tại quán" value={formData.pickupBranchIds} placeholder="main-store, district-1" onChange={(pickupBranchIds) => setFormData((prev) => ({ ...prev, pickupBranchIds }))} /><TextAreaField label="Điều kiện bảo quản" value={formData.storage} onChange={(storage) => setFormData((prev) => ({ ...prev, storage }))} className="md:col-span-2" /><TagInput label="Khu vực bán" value={formData.saleArea} placeholder="Buôn Ma Thuột, Đắk Lắk" onChange={(saleArea) => setFormData((prev) => ({ ...prev, saleArea }))} className="md:col-span-2" /></div><p className="mt-3 text-xs leading-5 text-neutral-500">Đây là chính sách bảo quản của sản phẩm. Hạn dùng theo từng lô/FEFO sẽ được ghi ở nghiệp vụ batch khi module lô hàng được bật.</p></FormSection>;
}

function movementLabel(type: InventoryMovement["type"]) {
  const labels: Record<InventoryMovement["type"], string> = { purchase_receipt: "Nhập mua", production_issue: "Xuất cho sản xuất", production_output: "Nhập thành phẩm", sale: "Xuất bán", waste: "Hao hụt", adjustment: "Điều chỉnh" };
  return labels[type];
}

function formatMovementDate(value: unknown) {
  const date = value && typeof value === "object" && "seconds" in value
    ? new Date(Number((value as { seconds: number }).seconds) * 1000)
    : new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function BomSection({
  productId,
  costingSummary,
}: {
  productId: string;
  costingSummary: ProductCostSummary | null;
}) {
  const recipe = costingSummary?.source === "recipe" ? costingSummary.recipe : null;
  return (
    <FormSection title="Định mức nguyên liệu (BOM)">
      {recipe ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-black text-neutral-950">BOM v{recipe.version}</p><p className="mt-0.5 text-sm text-neutral-500">Yield {recipe.yieldQuantity} · Hao hụt {(recipe.wasteBasisPoints / 100).toFixed(1)}%</p></div>
            <Link href={`/wholesale/finance/costing?productId=${productId}`} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700">Chỉnh BOM</Link>
          </div>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">{recipe.lines.map((line) => <div key={`${line.ingredientId}-${line.quantity}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><span className="font-semibold text-neutral-800">{line.ingredientName}</span><span className="text-neutral-500">{line.quantity} {unitLabel(line.baseUnit)}</span></div>)}</div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-4"><p className="font-bold text-neutral-800">Chưa có BOM hoạt động</p><p className="mt-1 text-sm text-neutral-500">Thiết lập định mức để giá vốn tự cập nhật theo giá nguyên liệu.</p><Link href={`/wholesale/finance/costing?productId=${productId}`} className="mt-3 inline-flex rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50">Lập BOM</Link></div>
      )}
    </FormSection>
  );
}

type BomDraft = {
  yieldQuantity: number;
  effectiveFrom: string;
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wastePercent: number;
};

type BomDraftLine = { ingredientId: string; quantity: number };

function createBomDraft(recipe?: RecipeVersion): BomDraft {
  return {
    yieldQuantity: recipe?.yieldQuantity ?? 1,
    effectiveFrom: toDateValue(recipe?.effectiveFrom),
    packagingCostPerBatch: recipe?.packagingCostPerBatch ?? 0,
    directLaborCostPerBatch: recipe?.directLaborCostPerBatch ?? 0,
    overheadCostPerBatch: recipe?.overheadCostPerBatch ?? 0,
    wastePercent: (recipe?.wasteBasisPoints ?? 0) / 100,
  };
}

function toDateValue(value?: Date | string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

export function ProductionBomEditor({ productId, onActivated }: { productId: string; onActivated?: () => Promise<void> }) {
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<RecipeVersion | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<RecipeVersion | null>(null);
  const [draftRecipeId, setDraftRecipeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BomDraft>(() => createBomDraft());
  const [lines, setLines] = useState<BomDraftLine[]>([{ ingredientId: "", quantity: 0 }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const [ingredientResponse, recipeResponse] = await Promise.all([
        fetch("/api/wholesale/finance/ingredients", { cache: "no-store" }),
        fetch("/api/wholesale/finance/recipes", { cache: "no-store" }),
      ]);
      const nextIngredients = ingredientResponse.ok ? await ingredientResponse.json() as FinanceIngredient[] : [];
      const recipes = recipeResponse.ok ? await recipeResponse.json() as RecipeVersion[] : [];
      if (cancelled) return;
      const productRecipes = recipes.filter((recipe) => recipe.productId === productId);
      const source = productRecipes.find((recipe) => recipe.status === "active") ?? [...productRecipes].sort((a, b) => b.version - a.version)[0] ?? null;
      setIngredients(nextIngredients.filter((ingredient) => ingredient.isActive));
      setActiveRecipe(source);
      setDraftRecipeId(source?.status === "draft" ? source.id : null);
      setDraftRecipe(source?.status === "draft" ? source : null);
      setDraft(createBomDraft(source ?? undefined));
      setLines(source?.ingredients.map((line) => ({ ingredientId: line.ingredientId, quantity: line.quantity })) ?? [{ ingredientId: "", quantity: 0 }]);
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [productId]);

  const updateLine = (index: number, updates: Partial<BomDraftLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line));
  };

  const saveDraft = async () => {
    const validLines = lines.filter((line) => line.ingredientId && Number(line.quantity) > 0);
    if (!validLines.length || draft.yieldQuantity < 1) {
      toast.warning("Cần có ít nhất một nguyên liệu và sản lượng mẻ hợp lệ.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/wholesale/finance/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, effectiveFrom: new Date(draft.effectiveFrom), yieldQuantity: Math.round(draft.yieldQuantity), ingredients: validLines, packagingCostPerBatch: Math.round(draft.packagingCostPerBatch), directLaborCostPerBatch: Math.round(draft.directLaborCostPerBatch), overheadCostPerBatch: Math.round(draft.overheadCostPerBatch), wasteBasisPoints: Math.round(draft.wastePercent * 100) }),
      });
      const created = await response.json() as RecipeVersion | { error?: string };
      if (!response.ok || !("id" in created)) throw new Error("Không thể lưu BOM nháp.");
      setDraftRecipeId(created.id);
      setDraftRecipe(created);
      toast.success(`Đã lưu BOM v${created.version} ở trạng thái nháp. Kích hoạt khi sẵn sàng áp dụng.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu BOM nháp.");
    } finally {
      setIsSaving(false);
    }
  };

  const activateDraft = async () => {
    if (!draftRecipeId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/wholesale/finance/recipes/${draftRecipeId}/activate`, { method: "POST" });
      if (!response.ok) throw new Error("Không thể kích hoạt BOM.");
      setActiveRecipe({ ...(draftRecipe ?? activeRecipe ?? { id: draftRecipeId, productId, version: 0, status: "active", effectiveFrom: new Date(), yieldQuantity: draft.yieldQuantity, ingredients: [], packagingCostPerBatch: 0, directLaborCostPerBatch: 0, overheadCostPerBatch: 0, wasteBasisPoints: 0 }), id: draftRecipeId, status: "active" });
      setDraftRecipeId(null);
      setDraftRecipe(null);
      await onActivated?.();
      toast.success("BOM đã được kích hoạt; giá vốn và sheet Tài chính đã được cập nhật.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể kích hoạt BOM.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormSection title="Công thức & định mức (BOM)">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3"><div><p className="text-sm font-black text-amber-950">{activeRecipe?.status === "active" ? `Đang áp dụng BOM v${activeRecipe.version}` : "Chưa có BOM đang áp dụng"}</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Lưu sẽ tạo một phiên bản nháp mới; kích hoạt mới làm giá thành và nghiệp vụ dùng công thức đó.</p></div>{draftRecipeId && <button type="button" onClick={activateDraft} disabled={isSaving} className="h-9 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">Kích hoạt BOM nháp</button>}</div>
      {isLoading ? <div className="flex h-32 items-center justify-center text-sm text-neutral-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tải định mức…</div> : <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><NumberField label="Sản lượng chuẩn / mẻ" min={1} value={draft.yieldQuantity} onChange={(yieldQuantity) => setDraft((current) => ({ ...current, yieldQuantity }))} /><TextField label="Hiệu lực từ" type="date" value={draft.effectiveFrom} onChange={(effectiveFrom) => setDraft((current) => ({ ...current, effectiveFrom }))} /><NumberField label="Hao hụt (%)" min={0} value={draft.wastePercent} onChange={(wastePercent) => setDraft((current) => ({ ...current, wastePercent }))} /></div><div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-neutral-900">Nguyên liệu</p><button type="button" onClick={() => setLines((current) => [...current, { ingredientId: "", quantity: 0 }])} className="text-xs font-bold text-brand-700 hover:text-brand-800">+ Thêm dòng</button></div><div className="space-y-2">{lines.map((line, index) => <div key={`${line.ingredientId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2"><select value={line.ingredientId} onChange={(event) => updateLine(index, { ingredientId: event.target.value })} className="h-10 min-w-0 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"><option value="">Chọn nguyên liệu</option>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({unitLabel(ingredient.baseUnit)})</option>)}</select><input type="number" min={0} value={line.quantity || ""} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) || 0 })} placeholder="Định lượng" className="h-10 rounded-lg border border-neutral-300 px-2.5 text-sm outline-none focus:border-brand-500" /><button type="button" onClick={() => setLines((current) => current.length > 1 ? current.filter((_, lineIndex) => lineIndex !== index) : current)} className="grid h-10 w-9 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label={`Xóa nguyên liệu ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div></div><div className="grid gap-3 sm:grid-cols-3"><NumberField label="Bao bì / mẻ" min={0} value={draft.packagingCostPerBatch} onChange={(packagingCostPerBatch) => setDraft((current) => ({ ...current, packagingCostPerBatch }))} /><NumberField label="Nhân công / mẻ" min={0} value={draft.directLaborCostPerBatch} onChange={(directLaborCostPerBatch) => setDraft((current) => ({ ...current, directLaborCostPerBatch }))} /><NumberField label="Overhead / mẻ" min={0} value={draft.overheadCostPerBatch} onChange={(overheadCostPerBatch) => setDraft((current) => ({ ...current, overheadCostPerBatch }))} /></div><button type="button" onClick={saveDraft} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Lưu BOM nháp</button></div>}
    </FormSection>
  );
}

export function ProductionProcessSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  const productionSteps = formData.productionSteps ?? [];
  const updateStep = (
    id: string,
    field: keyof Pick<ProductionStep, "name" | "durationMinutes" | "workstation">,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      productionSteps: (prev.productionSteps ?? []).map((step) =>
        step.id === id ? { ...step, [field]: value } : step,
      ),
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      productionSteps: [
        ...(prev.productionSteps ?? []),
        { id: crypto.randomUUID(), name: "", durationMinutes: 0 },
      ],
    }));
  };

  return (
    <FormSection title="Quy trình / công đoạn" action={<button type="button" onClick={addStep} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100"><Plus className="h-3.5 w-3.5" /> Thêm công đoạn</button>}>
      {productionSteps.length > 0 ? (
        <div className="space-y-2">
          {productionSteps.map((step, index) => (
            <div key={step.id} className="grid grid-cols-[28px_minmax(0,1fr)_110px_36px] items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 sm:grid-cols-[28px_minmax(0,1fr)_120px_110px_36px]">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[11px] font-black text-amber-800">{index + 1}</span>
              <input type="text" placeholder="Ví dụ: Trộn bột, nướng, trang trí" value={step.name} onChange={(event) => updateStep(step.id, "name", event.target.value)} className="h-9 min-w-0 rounded-md border border-neutral-300 px-2.5 text-sm outline-none focus:border-brand-500" />
              <input type="text" placeholder="Trạm / khu vực" value={step.workstation ?? ""} onChange={(event) => updateStep(step.id, "workstation", event.target.value)} className="hidden h-9 min-w-0 rounded-md border border-neutral-300 px-2.5 text-sm outline-none focus:border-brand-500 sm:block" />
              <label className="relative"><input type="number" min={0} value={step.durationMinutes} onChange={(event) => updateStep(step.id, "durationMinutes", Number(event.target.value) || 0)} className="h-9 w-full rounded-md border border-neutral-300 px-2.5 pr-9 text-sm outline-none focus:border-brand-500" /><span className="pointer-events-none absolute right-2.5 top-2.5 text-[11px] font-semibold text-neutral-400">phút</span></label>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, productionSteps: (prev.productionSteps ?? []).filter((item) => item.id !== step.id) }))} className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Xóa công đoạn ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      ) : <EmptyHint text="Chưa có công đoạn. Thêm các bước thực hiện để bếp và quản đốc có cùng một quy trình." />}
    </FormSection>
  );
}

export function ProductionScheduleSection({
  formData,
  setFormData,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}) {
  const totalStepMinutes = (formData.productionSteps ?? []).reduce((total, step) => total + (Number(step.durationMinutes) || 0), 0);
  return <FormSection title="Đầu ra & thời gian sản xuất"><div className="grid gap-3 md:grid-cols-3"><NumberField label="Sản lượng một mẻ" min={1} value={formData.manufacturingOutputQuantity} onChange={(manufacturingOutputQuantity) => setFormData((prev) => ({ ...prev, manufacturingOutputQuantity }))} /><TextField label="Đơn vị đầu ra" value={formData.manufacturingOutputUnit} onChange={(manufacturingOutputUnit) => setFormData((prev) => ({ ...prev, manufacturingOutputUnit }))} /><NumberField label="Lead-time sản xuất (phút)" min={0} value={formData.manufacturingLeadMinutes} onChange={(manufacturingLeadMinutes) => setFormData((prev) => ({ ...prev, manufacturingLeadMinutes }))} /></div><div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">Tổng thời lượng công đoạn: <span className="font-bold">{totalStepMinutes} phút</span>{formData.manufacturingLeadMinutes > 0 && totalStepMinutes > formData.manufacturingLeadMinutes ? " · đang dài hơn lead-time sản xuất" : ""}</div></FormSection>;
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50/40 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="number"
        required={required}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function TagInput({
  label,
  value,
  placeholder,
  onChange,
  className,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <span className="mt-1 block text-xs text-neutral-500">
        Nhập nhiều giá trị, cách nhau bằng dấu phẩy.
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  );
}

function OptionHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-neutral-800">{label}</div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm
      </button>
    </div>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500">
      {text}
    </div>
  );
}

function CostMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-black text-neutral-950">
        {new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(value)}
      </div>
    </div>
  );
}

function FinanceMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "neutral" | "danger";
}) {
  const toneClass = tone === "blue" ? "border-blue-100 bg-blue-50/70 text-blue-800" : tone === "danger" ? "border-red-100 bg-red-50/70 text-red-700" : "border-neutral-200 bg-neutral-50 text-neutral-900";
  return <div className={clsx("rounded-xl border p-3", toneClass)}><p className="text-xs font-semibold text-neutral-500">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;
}
