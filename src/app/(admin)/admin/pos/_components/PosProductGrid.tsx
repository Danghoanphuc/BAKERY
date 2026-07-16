import Link from "next/link";
import { History, LayoutGrid, Monitor, ScanLine, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { productBelongsToCategory } from "@/lib/product-category";
import type { Category, Product } from "@/types";
import {
  formatCurrency,
  getProductStockLabel,
  isProductSellableToday,
} from "../_lib/pos-utils";

type PosProductGridProps = {
  products: Product[];
  categories: Category[];
  selectedCategory: string | "all";
  searchTerm: string;
  onCategoryChange: (category: string | "all") => void;
  onSearchChange: (value: string) => void;
  onProductClick: (product: Product) => void;
  onOpenCustomerDisplay: () => void;
  onScannerInput?: (value: string) => void;
  onScannerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function PosProductGrid({
  products,
  categories,
  selectedCategory,
  searchTerm,
  onCategoryChange,
  onSearchChange,
  onProductClick,
  onOpenCustomerDisplay,
  onScannerInput,
  onScannerKeyDown,
}: PosProductGridProps) {
  return (
    <section className="flex min-h-[65vh] min-w-0 flex-col xl:min-h-0">
      <div className="border-b border-[#f0e1d2] bg-white">
        <div className="grid gap-2.5 px-3 py-2.5 xl:grid-cols-[minmax(180px,0.75fr)_minmax(240px,1.25fr)] xl:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-[#3d2417]">POS bán hàng</h1>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#9b8171]">
              Chạm món để thêm nhanh, món có biến thể sẽ mở tuỳ chọn.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <SearchBox value={searchTerm} onChange={onSearchChange} onScannerInput={onScannerInput} onScannerKeyDown={onScannerKeyDown} />
            <Link href="/admin/pos/orders" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#eadbcc] bg-[#fffaf6] text-[#7b6254] transition hover:border-[#b84a39]/50 hover:bg-white hover:text-[#b84a39]" aria-label="Đơn hàng POS" title="Quản lý đơn POS"><History className="h-5 w-5" /></Link>
            <Link href="/admin/pos/vouchers/scan" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#eadbcc] bg-[#fffaf6] text-[#7b6254] transition hover:border-[#b84a39]/50 hover:bg-white hover:text-[#b84a39]" aria-label="Quét voucher" title="Quét voucher"><ScanLine className="h-5 w-5" /></Link>
            <button
              type="button"
              onClick={onOpenCustomerDisplay}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#eadbcc] bg-[#fffaf6] text-[#7b6254] transition hover:border-[#b84a39]/50 hover:bg-white hover:text-[#b84a39]"
              aria-label="Mở màn hình khách"
              title="Mở màn hình khách"
            >
              <Monitor className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-t border-[#f7eadf] px-3 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryButton
              active={selectedCategory === "all"}
              label="Tất cả"
              count={products.length}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              onClick={() => onCategoryChange("all")}
            />
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                active={selectedCategory === category.id}
                label={category.name}
                count={
                  products.filter((product) =>
                    productBelongsToCategory(product, category),
                  ).length
                }
                onClick={() => onCategoryChange(category.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {products.length === 0 ? (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#eadbcc] bg-white text-sm font-semibold text-[#9b8171]">
            Không có sản phẩm phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(126px,1fr))] gap-2.5 xl:grid-cols-4">
            {products.map((product) => {
              const sellable = isProductSellableToday(product);
              const stockLabel = getProductStockLabel(product);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onProductClick(product)}
                  disabled={!sellable}
                  className={clsx(
                    "group flex h-[168px] flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition active:scale-[0.98]",
                    sellable
                      ? "border-[#eadbcc] hover:border-[#b84a39]/50 hover:shadow-md"
                      : "cursor-not-allowed border-[#eadbcc] opacity-55",
                  )}
                >
                  <div className="relative h-[82px] shrink-0 bg-[#fdf7f0]">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                    {stockLabel && (
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-[#7b6254] shadow-sm">
                        {stockLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-2.5 py-2.5">
                    <h3 className="line-clamp-2 min-h-[34px] text-xs font-medium leading-[17px] text-[#3d2417]">
                      {product.name}
                    </h3>
                    <p className="mt-auto pt-1 text-[13px] font-bold leading-none text-[#b84a39]">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SearchBox({
  value,
  onChange,
  onScannerInput,
  onScannerKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onScannerInput?: (value: string) => void;
  onScannerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onScannerInput?.(event.target.value);
        }}
        onKeyDown={onScannerKeyDown}
        placeholder="Quét mã hoặc tìm bánh, SKU, tag..."
        className="h-10 w-full rounded-xl border border-[#eadbcc] bg-[#fffaf6] pl-10 pr-10 text-sm font-semibold text-[#3d2417] shadow-inner outline-none transition placeholder:text-[#b49a8a] focus:border-[#b84a39] focus:bg-white focus:ring-4 focus:ring-[#b84a39]/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#9b8171] transition hover:bg-[#fff1f0] hover:text-[#b84a39]"
          aria-label="Xoá tìm kiếm"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

function CategoryButton({
  active,
  label,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-black transition",
        active
          ? "bg-[#b84a39] text-white shadow-sm"
          : "border border-[#eadbcc] bg-white text-[#65483a] hover:border-[#b84a39]/50",
      )}
    >
      {icon}
      <span className="max-w-[130px] truncate">{label}</span>
      <span
        className={clsx(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-white/20 text-white" : "bg-[#fff1f0] text-[#b84a39]",
        )}
      >
        {count}
      </span>
    </button>
  );
}
