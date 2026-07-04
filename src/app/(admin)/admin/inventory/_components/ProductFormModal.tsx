import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useState } from "react";
import { Bot, ImagePlus, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import type { Category, Product, SizeOption } from "@/types";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import type { ProductFormData } from "../_lib/product-form";
import { splitTags } from "../_lib/product-form";

type ProductFormModalProps = {
  categories: Category[];
  editingProduct: Product | null;
  formData: ProductFormData;
  assistantNote: string | null;
  isSaving: boolean;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApplyAssistant: () => void;
};

export function ProductFormModal({
  categories,
  editingProduct,
  formData,
  assistantNote,
  isSaving,
  setFormData,
  onClose,
  onSubmit,
  onApplyAssistant,
}: ProductFormModalProps) {
  const addSizeOption = () => {
    setFormData((prev) => ({
      ...prev,
      sizeOptions: [
        ...prev.sizeOptions,
        { id: crypto.randomUUID(), label: "", priceAdjustment: 0 },
      ],
    }));
  };

  const updateSizeOption = (
    index: number,
    field: keyof SizeOption,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const nextSizes = [...prev.sizeOptions];
      nextSizes[index] = { ...nextSizes[index], [field]: value };
      return { ...prev, sizeOptions: nextSizes };
    });
  };

  const removeSizeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sizeOptions: prev.sizeOptions.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addFlavorOption = () => {
    setFormData((prev) => ({
      ...prev,
      flavorOptions: [
        ...prev.flavorOptions,
        { id: crypto.randomUUID(), label: "" },
      ],
    }));
  };

  const updateFlavorOption = (index: number, label: string) => {
    setFormData((prev) => {
      const nextFlavors = [...prev.flavorOptions];
      nextFlavors[index] = { ...nextFlavors[index], label };
      return { ...prev, flavorOptions: nextFlavors };
    });
  };

  const removeFlavorOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      flavorOptions: prev.flavorOptions.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">
              {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Điền đủ giá bán, tồn kho, kênh bán và metadata để sản phẩm hoạt
              động tốt ở trang khách hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <SalesInfoSection
                categories={categories}
                formData={formData}
                setFormData={setFormData}
              />
              <VariantSection
                formData={formData}
                addSizeOption={addSizeOption}
                updateSizeOption={updateSizeOption}
                removeSizeOption={removeSizeOption}
                addFlavorOption={addFlavorOption}
                updateFlavorOption={updateFlavorOption}
                removeFlavorOption={removeFlavorOption}
              />
            </div>

            <div className="space-y-5">
              <OperationsSection formData={formData} setFormData={setFormData} />
              <DisplayLabelsSection formData={formData} setFormData={setFormData} />
              <MetadataSection
                formData={formData}
                setFormData={setFormData}
                assistantNote={assistantNote}
                onApplyAssistant={onApplyAssistant}
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalesInfoSection({
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
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Tên sản phẩm"
          required
          value={formData.name}
          onChange={(name) => setFormData((prev) => ({ ...prev, name }))}
          className="md:col-span-2"
        />
        <NumberField
          label="Giá bán (VND)"
          required
          min={0}
          value={formData.price}
          onChange={(price) => setFormData((prev) => ({ ...prev, price }))}
        />
        <NumberField
          label="Tồn kho"
          required
          min={0}
          value={formData.stock}
          onChange={(stock) => setFormData((prev) => ({ ...prev, stock }))}
        />
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Danh mục
          </span>
          <select
            required
            value={formData.categoryId}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, categoryId: event.target.value }))
            }
            className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <ProductImageUploader
          formData={formData}
          setFormData={setFormData}
          className="md:col-span-2"
        />
        <TextAreaField
          label="Mô tả"
          value={formData.description}
          onChange={(description) =>
            setFormData((prev) => ({ ...prev, description }))
          }
          className="md:col-span-2"
        />
      </div>
    </FormSection>
  );
}

function ProductImageUploader({
  formData,
  setFormData,
  className,
}: {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  className?: string;
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

        const response = await fetch("/api/uploads/cloudinary", {
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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
              <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
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
        <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
          <ImagePlus className="h-8 w-8 text-neutral-400" />
          <span className="mt-2 text-sm font-semibold text-neutral-700">
            Tải ảnh sản phẩm
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            Chọn một hoặc nhiều ảnh từ máy tính.
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

function VariantSection({
  formData,
  addSizeOption,
  updateSizeOption,
  removeSizeOption,
  addFlavorOption,
  updateFlavorOption,
  removeFlavorOption,
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
  updateFlavorOption: (index: number, label: string) => void;
  removeFlavorOption: (index: number) => void;
}) {
  return (
    <FormSection title="Biến thể sản phẩm">
      <div className="space-y-4">
        <OptionHeader label="Kích thước" onAdd={addSizeOption} />
        <div className="space-y-2">
          {formData.sizeOptions.map((size, index) => (
            <div key={size.id} className="grid gap-2 md:grid-cols-[1fr_160px_40px]">
              <input
                type="text"
                placeholder="Ví dụ: 16cm, 20cm"
                value={size.label}
                onChange={(event) =>
                  updateSizeOption(index, "label", event.target.value)
                }
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                type="number"
                min={0}
                placeholder="Giá thêm"
                value={size.priceAdjustment}
                onChange={(event) =>
                  updateSizeOption(
                    index,
                    "priceAdjustment",
                    Number(event.target.value) || 0,
                  )
                }
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <IconButton label="Xóa kích thước" onClick={() => removeSizeOption(index)} />
            </div>
          ))}
          {formData.sizeOptions.length === 0 && (
            <EmptyHint text="Chưa có kích thước riêng. Giá bán phía trên sẽ là giá mặc định." />
          )}
        </div>

        <OptionHeader label="Vị / nhân bánh" onAdd={addFlavorOption} />
        <div className="space-y-2">
          {formData.flavorOptions.map((flavor, index) => (
            <div key={flavor.id} className="grid gap-2 md:grid-cols-[1fr_40px]">
              <input
                type="text"
                placeholder="Ví dụ: Socola, Matcha, Vanilla"
                value={flavor.label}
                onChange={(event) => updateFlavorOption(index, event.target.value)}
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <IconButton label="Xóa vị" onClick={() => removeFlavorOption(index)} />
            </div>
          ))}
          {formData.flavorOptions.length === 0 && (
            <EmptyHint text="Chưa có lựa chọn vị riêng." />
          )}
        </div>
      </div>
    </FormSection>
  );
}

function OperationsSection({
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
      </div>
    </FormSection>
  );
}

function DisplayLabelsSection({
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

function MetadataSection({
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
        <TagInput
          label="Tag sản phẩm"
          value={formData.tags}
          placeholder="socola, bánh nướng, ghi lời chúc"
          onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
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
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
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
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
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
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
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
