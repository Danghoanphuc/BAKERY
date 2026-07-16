"use client";

import Link from "next/link";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  PackageCheck,
  PackageOpen,
  Pencil,
  Store,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Category, Product } from "@/types";
import { getProductStockQty, isProductListed, isProductOutOfStock } from "@/lib/product-availability";
import { productBelongsToCategory } from "@/lib/product-category";
import { ProductWorkspaceDrawer } from "../../inventory/_components/ProductWorkspaceDrawer";

type CategoryDrawerProps = {
  category: Category;
  products: Product[];
  isOpen: boolean;
  isSaving: boolean;
  isLoadingProducts: boolean;
  productsError: string | null;
  onClose: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleVisibility: (category: Category) => void;
};

type DrawerTab = "operations" | "merchandising";

export function CategoryDrawer({
  category,
  products,
  isOpen,
  isSaving,
  isLoadingProducts,
  productsError,
  onClose,
  onEdit,
  onDelete,
  onToggleVisibility,
}: CategoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("operations");
  const categoryProducts = useMemo(
    () => products.filter((product) => productBelongsToCategory(product, category)),
    [category, products],
  );
  const isVisible = category.isVisible ?? true;

  return (
    <ProductWorkspaceDrawer
      isOpen={isOpen}
      title={`Danh mục ${category.name}`}
      onClose={onClose}
      header={<DrawerHeader category={category} activeTab={activeTab} onTabChange={setActiveTab} />}
    >
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
        <div className="flex-1 px-5 py-6 sm:px-7">
          {activeTab === "operations" ? (
            <OperationsTab
              category={category}
              products={categoryProducts}
              isLoading={isLoadingProducts}
              error={productsError}
            />
          ) : (
            <MerchandisingTab category={category} />
          )}
        </div>

        <DrawerActions
          category={category}
          isVisible={isVisible}
          isSaving={isSaving}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleVisibility={onToggleVisibility}
        />
      </div>
    </ProductWorkspaceDrawer>
  );
}

function DrawerHeader({
  category,
  activeTab,
  onTabChange,
}: {
  category: Category;
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
}) {
  const isVisible = category.isVisible ?? true;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex min-w-0 items-center gap-4 px-5 py-5 pr-16 sm:px-7 sm:pr-16">
        <CategoryImage category={category} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Danh mục</p>
          <h2 className="truncate text-xl font-bold text-neutral-950">{category.name}</h2>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isVisible ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
            {isVisible ? "Đang hiển thị" : "Đang ẩn"}
          </span>
        </div>
      </div>
      <nav className="flex gap-1 px-5 sm:px-7" aria-label="Không gian danh mục" role="tablist">
        <TabButton active={activeTab === "operations"} onClick={() => onTabChange("operations")}>
          Vận hành
        </TabButton>
        <TabButton active={activeTab === "merchandising"} onClick={() => onTabChange("merchandising")}>
          Trưng bày
        </TabButton>
      </nav>
    </header>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? "border-brand-500 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}
    >
      {children}
    </button>
  );
}

function OperationsTab({
  category,
  products,
  isLoading,
  error,
}: {
  category: Category;
  products: Product[];
  isLoading: boolean;
  error: string | null;
}) {
  const orderedProducts = useMemo(
    () => [...products].sort((left, right) => productPriority(left) - productPriority(right) || left.name.localeCompare(right.name, "vi")),
    [products],
  );
  const attentionCount = products.filter(needsProductAttention).length;

  return (
    <div className="space-y-7">
      <CategoryHealth
        category={category}
        attentionCount={attentionCount}
        productCount={products.length}
        isLoading={isLoading}
      />

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-neutral-950">Sản phẩm trong danh mục</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {isLoading ? "Đang tải danh sách sản phẩm…" : `${products.length} sản phẩm · ${attentionCount} cần chú ý`}
            </p>
          </div>
          {!isLoading && products.length > 0 && <span className="text-xs font-semibold text-neutral-500">Ưu tiên hiển thị mục cần xử lý</span>}
        </div>

        {isLoading ? (
          <ProductLoadingState />
        ) : error ? (
          <EmptyState icon={<TriangleAlert className="h-5 w-5" />} message={error} />
        ) : orderedProducts.length === 0 ? (
          <EmptyState icon={<PackageOpen className="h-5 w-5" />} message="Danh mục này chưa có sản phẩm nào." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {orderedProducts.map((product) => <CategoryProductRow key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryHealth({
  category,
  attentionCount,
  productCount,
  isLoading,
}: {
  category: Category;
  attentionCount: number;
  productCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />;
  }

  const content = getHealthContent(category, attentionCount, productCount);
  const Icon = content.icon;

  return (
    <section className={`rounded-2xl border p-5 ${content.tone}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/75"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm font-bold">{content.title}</p>
          <p className="mt-1 text-sm leading-6 opacity-85">{content.description}</p>
        </div>
      </div>
    </section>
  );
}

function CategoryProductRow({ product }: { product: Product }) {
  const status = getProductStatus(product);

  return (
    <Link
      href={`/admin/inventory/${product.id}`}
      className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 p-3 last:border-b-0 hover:bg-brand-50/40 focus:bg-brand-50/40 focus:outline-none"
    >
      <ProductImage product={product} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-neutral-950">{product.displayName || product.name}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">{product.sku || "Chưa có SKU"}</p>
        <p className="mt-1 text-xs text-neutral-500">{getStockDescription(product)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`hidden rounded-full px-2 py-1 text-xs font-semibold sm:inline-flex ${status.tone}`}>{status.label}</span>
        <ExternalLink className="h-4 w-4 text-neutral-400 transition group-hover:text-brand-600" aria-hidden="true" />
      </div>
    </Link>
  );
}

function MerchandisingTab({ category }: { category: Category }) {
  const isVisible = category.isVisible ?? true;

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-base font-bold text-neutral-950">Hiển thị ngoài cửa hàng</h3>
        <p className="mt-1 text-sm text-neutral-500">Kiểm soát việc khách nhìn thấy danh mục và thứ tự trưng bày.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Store className="h-5 w-5 text-brand-600" />
            <p className="mt-4 text-sm font-semibold text-neutral-500">Trạng thái cửa hàng</p>
            <p className="mt-1 text-lg font-bold text-neutral-950">{isVisible ? "Đang hiển thị" : "Đang ẩn"}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <PackageCheck className="h-5 w-5 text-brand-600" />
            <p className="mt-4 text-sm font-semibold text-neutral-500">Thứ tự trưng bày</p>
            <p className="mt-1 text-lg font-bold text-neutral-950">Vị trí #{(category.displayOrder ?? 0) + 1}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-neutral-950">Xem trước trên cửa hàng</h3>
        <div className="mt-4 w-48 overflow-hidden rounded-[18px] border border-[#f0d8c2] bg-[#fff7ed] shadow-sm">
          <div className="min-h-12 px-3 pt-3 text-sm font-black leading-tight text-[#542413]">{category.name}</div>
          <div className="relative aspect-square bg-neutral-100">
            {category.iconUrl ? <img src={category.iconUrl} alt={category.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-neutral-400"><PackageOpen className="h-7 w-7" /></div>}
          </div>
          <div className="px-3 py-2 text-xs font-semibold text-[#8a6855]">{isVisible ? "Đang hiển thị" : "Đang ẩn"}</div>
        </div>
      </section>
    </div>
  );
}

function DrawerActions({
  category,
  isVisible,
  isSaving,
  onClose,
  onEdit,
  onDelete,
  onToggleVisibility,
}: Omit<CategoryDrawerProps, "products" | "isOpen" | "isLoadingProducts" | "productsError"> & { isVisible: boolean }) {
  return (
    <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-neutral-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
      <button type="button" onClick={() => onToggleVisibility(category)} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60">
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {isVisible ? "Ẩn" : "Hiện"}
      </button>
      <button type="button" onClick={() => { onClose(); onEdit(category); }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">
        <Pencil className="h-4 w-4" />Sửa danh mục
      </button>
      <button type="button" onClick={() => { onClose(); onDelete(category); }} disabled={isSaving} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
        <Trash2 className="h-4 w-4" />Xóa
      </button>
    </div>
  );
}

function ProductLoadingState() {
  return <div className="grid min-h-52 place-items-center rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-500"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Đang tải sản phẩm…</span></div>;
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center text-sm font-medium text-neutral-500"><span className="mb-2 text-neutral-400">{icon}</span>{message}</div>;
}

function CategoryImage({ category }: { category: Category }) {
  return <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 shadow-sm">{category.iconUrl ? <img src={category.iconUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-neutral-400"><PackageOpen className="h-5 w-5" /></div>}</div>;
}

function ProductImage({ product }: { product: Product }) {
  return <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-neutral-400"><PackageOpen className="h-5 w-5" /></div>}</div>;
}

function needsProductAttention(product: Product) {
  return !isProductListed(product) || isProductOutOfStock(product);
}

function productPriority(product: Product) {
  if (isProductOutOfStock(product)) return 0;
  if (!isProductListed(product)) return 1;
  return 2;
}

function getProductStatus(product: Product) {
  if (!isProductListed(product)) return { label: "Đang ẩn", tone: "bg-neutral-100 text-neutral-600" };
  if (isProductOutOfStock(product)) return { label: "Hết hàng", tone: "bg-red-100 text-red-700" };
  if (typeof product.stock === "number" && product.stock < 10) return { label: "Sắp hết", tone: "bg-amber-100 text-amber-800" };
  return { label: "Đang bán", tone: "bg-green-100 text-green-700" };
}

function getStockDescription(product: Product) {
  if (product.stock === undefined) return "Chưa theo dõi tồn kho";
  return `${getProductStockQty(product)} sản phẩm tồn kho`;
}

function getHealthContent(category: Category, attentionCount: number, productCount: number) {
  if (productCount === 0) return { icon: PackageOpen, title: "Danh mục đang trống", description: "Thêm sản phẩm để danh mục có thể phục vụ khách hàng.", tone: "border-amber-200 bg-amber-50 text-amber-900" };
  if (attentionCount > 0) return { icon: TriangleAlert, title: `${attentionCount} sản phẩm cần xử lý`, description: "Các sản phẩm hết hàng hoặc đang ẩn được đưa lên đầu danh sách.", tone: "border-amber-200 bg-amber-50 text-amber-900" };
  if (!(category.isVisible ?? true)) return { icon: EyeOff, title: "Danh mục đang ẩn", description: "Sản phẩm đã sẵn sàng nhưng khách chưa nhìn thấy danh mục này.", tone: "border-neutral-200 bg-neutral-50 text-neutral-800" };
  return { icon: PackageCheck, title: "Danh mục sẵn sàng bán", description: "Sản phẩm đều đang có thể bán và danh mục đang hiển thị ngoài cửa hàng.", tone: "border-green-200 bg-green-50 text-green-900" };
}
