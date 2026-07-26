import { ImageIcon, Loader2, Search, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import type { ProductCostSummary } from "@/features/finance";
import { isProductListed } from "@/lib/product-availability";
import type { Category, Product } from "@/types";
import type { ProductFilter } from "../_lib/product-form";
import {
  formatPrice,
  getStockStatus,
  resolveInventoryCategoryName,
} from "../_lib/inventory-utils";

type InventoryTableProps = {
  products: Product[];
  categories: Category[];
  costingByProductId?: Record<string, ProductCostSummary>;
  isLoading: boolean;
  searchTerm: string;
  filter: ProductFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: ProductFilter) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  savingProductId?: string | null;
};

export function InventoryTable({
  products,
  categories,
  costingByProductId = {},
  isLoading,
  searchTerm,
  filter,
  onSearchChange,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleAvailability,
  savingProductId,
}: InventoryTableProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên, danh mục, tag, từ khóa..."
            className="h-10 w-full rounded-lg border border-neutral-300 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={filter}
          onChange={(event) =>
            onFilterChange(event.target.value as ProductFilter)
          }
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">Tất cả loại hàng</option>
          <option value="finished_good">Thành phẩm</option>
          <option value="semi_finished">Bán thành phẩm</option>
          <option value="ingredient">Nguyên liệu</option>
          <option value="selling">Đang bán</option>
          <option value="hidden">Ngừng bán</option>
          <option value="lowStock">Sắp hết hàng</option>
          <option value="outOfStock">Hết hàng</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <TableHead>Mặt hàng</TableHead>
              <TableHead>Phân loại</TableHead>
              <TableHead>Giá / Cost</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Nghiệp vụ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="right">Thao tác</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {isLoading && <LoadingRow />}
            {!isLoading &&
              products.map((product) => (
                <InventoryTableRow
                  key={product.id}
                  product={product}
                  categoryName={
                    resolveInventoryCategoryName(product, categories) ||
                    "Chưa phân loại"
                  }
                  costing={costingByProductId[product.id]}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleAvailability={onToggleAvailability}
                  isSaving={savingProductId === product.id}
                />
              ))}
            {!isLoading && products.length === 0 && <EmptyRow />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTableRow({
  product,
  categoryName,
  costing,
  onEdit,
  onDelete,
  onToggleAvailability,
  isSaving,
}: {
  product: Product;
  categoryName: string;
  costing?: ProductCostSummary;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  isSaving: boolean;
}) {
  const stockStatus = getStockStatus(product.stock ?? 0);
  const StockIcon = stockStatus.icon;
  const costSource = costing?.source ?? "missing";
  const type = product.itemType ?? "finished_good";
  const isFinishedGood = type === "finished_good";

  return (
    <tr onClick={() => onEdit(product)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(product); } }} tabIndex={0} className="cursor-pointer transition hover:bg-brand-50/40 focus:bg-brand-50/40 focus:outline-none">
      <td className="min-w-[280px] px-4 py-3">
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <div className="h-14 w-14 overflow-hidden rounded-lg">
              <ProductImage src={product.imageUrl} alt={product.name} />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-950">
              {product.name}
            </div>
            <ItemTypeBadge type={type} />
            {product.sku && (
              <div className="mt-0.5 font-mono text-xs text-neutral-400">
                {product.sku}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {(product.tags ?? []).slice(0, 3).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-neutral-700">
        {type === "ingredient"
          ? product.ingredientGroup || "Chưa phân nhóm"
          : type === "semi_finished"
            ? "Nội bộ · Sản xuất"
            : categoryName}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-neutral-950">
          {type === "ingredient"
            ? formatPrice(product.referencePurchasePrice ?? 0)
            : isFinishedGood
              ? formatPrice(product.price)
              : typeof costing?.totalCost === "number"
                ? formatPrice(costing.totalCost)
                : "Chưa tính"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {type === "ingredient" ? (
            <span className="text-xs text-neutral-500">Giá mua tham chiếu</span>
          ) : (
            <CostSourceBadge source={costSource} />
          )}
          {typeof costing?.totalCost === "number" && costing.totalCost > 0 && (
            <span className="text-xs text-neutral-500">
              cost {formatPrice(costing.totalCost)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-neutral-950">
          {product.stock ?? 0}
        </div>
        <div
          className={clsx(
            "mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
            stockStatus.tone,
          )}
        >
          <StockIcon className="h-3.5 w-3.5" />
          {stockStatus.label}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {isFinishedGood ? (
            <>
              {product.availableForDelivery && <Badge>Giao tận nơi</Badge>}
              {product.availableForPickup && <Badge>Đến lấy</Badge>}
              {product.availableToday && <Badge>Hôm nay</Badge>}
              {product.requiresPreorder && <Badge>Đặt trước</Badge>}
            </>
          ) : (
            <Badge>{type === "ingredient" ? "Mua hàng" : "Sản xuất / BOM"}</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {isFinishedGood ? <><button
          type="button"
          onClick={(event) => { event.stopPropagation(); onToggleAvailability(product); }}
          disabled={isSaving}
          className={clsx(
            "inline-flex h-7 w-12 items-center rounded-full px-1 transition focus:outline-none focus:ring-2 focus:ring-brand-200",
            isProductListed(product) ? "bg-emerald-500" : "bg-neutral-300",
            isSaving && "cursor-wait opacity-70",
          )}
          aria-label="Đổi trạng thái bán"
        >
          {isSaving ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-white" />
          ) : (
            <span
              className={clsx(
                "h-5 w-5 rounded-full bg-white shadow transition",
                isProductListed(product) ? "translate-x-5" : "translate-x-0",
              )}
            />
          )}
        </button>
        <div className="mt-1 text-xs text-neutral-500">
          {isProductListed(product) ? "Đang bán" : "Ngừng bán"}
        </div></> : <div><span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">{product.lifecycleStatus === "inactive" ? "Ngừng hoạt động" : product.lifecycleStatus === "draft" ? "Bản nháp" : "Đang hoạt động"}</span><p className="mt-1 text-xs text-neutral-500">Không xuất bản</p></div>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          {isFinishedGood && <span onClick={(event) => event.stopPropagation()}><ProductShareButton product={product} iconOnly label="Copy link san pham" className="border-0 text-neutral-500 hover:text-brand-600" /></span>}
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onDelete(product); }}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Xóa sản phẩm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ItemTypeBadge({
  type,
}: {
  type: NonNullable<Product["itemType"]>;
}) {
  const config = {
    finished_good: "Thành phẩm",
    semi_finished: "Bán thành phẩm",
    ingredient: "Nguyên liệu",
  } as const;
  return (
    <span className="mt-1 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-600">
      {config[type]}
    </span>
  );
}

function CostSourceBadge({
  source,
}: {
  source: ProductCostSummary["source"];
}) {
  if (source === "recipe") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
        BOM
      </span>
    );
  }
  if (source === "legacy") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
        Tay
      </span>
    );
  }
  return (
    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase text-neutral-500">
      Thiếu
    </span>
  );
}

function LoadingRow() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải dữ liệu kho...
        </div>
      </td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-500">
        Không có sản phẩm phù hợp với bộ lọc hiện tại.
      </td>
    </tr>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={clsx(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}
