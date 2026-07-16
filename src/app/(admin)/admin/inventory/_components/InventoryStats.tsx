import { formatPrice } from "../_lib/inventory-utils";

type BomCoverage = {
  total: number;
  recipe: number;
  legacy: number;
  missing: number;
};

type InventoryStatsProps = {
  totalProducts: number;
  sellingProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
  bomCoverage?: BomCoverage;
};

export function InventoryStats({
  totalProducts,
  sellingProducts,
  lowStockProducts,
  inventoryValue,
  bomCoverage,
}: InventoryStatsProps) {
  const bomLabel = bomCoverage
    ? `${bomCoverage.recipe}/${bomCoverage.total || totalProducts}`
    : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatBlock label="Tổng sản phẩm" value={totalProducts.toString()} />
      <StatBlock label="Đang bán" value={sellingProducts.toString()} />
      <StatBlock label="Cảnh báo tồn thấp" value={lowStockProducts.toString()} />
      <StatBlock label="Giá trị tồn kho" value={formatPrice(inventoryValue)} />
      <StatBlock
        label="Có BOM active"
        value={bomLabel}
        hint={
          bomCoverage
            ? `Tay ${bomCoverage.legacy} · Thiếu ${bomCoverage.missing}`
            : undefined
        }
      />
    </div>
  );
}

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] px-4 py-3 shadow-[0_14px_34px_rgba(61,36,23,0.06)]">
      <div className="text-xs font-black uppercase text-[#9b8171]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[#3d2417]">{value}</div>
      {hint && (
        <div className="mt-1 text-[11px] font-semibold text-[#9b8171]">{hint}</div>
      )}
    </div>
  );
}
