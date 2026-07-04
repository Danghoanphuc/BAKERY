import { formatPrice } from "../_lib/inventory-utils";

type InventoryStatsProps = {
  totalProducts: number;
  sellingProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
};

export function InventoryStats({
  totalProducts,
  sellingProducts,
  lowStockProducts,
  inventoryValue,
}: InventoryStatsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatBlock label="Tổng sản phẩm" value={totalProducts.toString()} />
      <StatBlock label="Đang bán" value={sellingProducts.toString()} />
      <StatBlock label="Cảnh báo tồn thấp" value={lowStockProducts.toString()} />
      <StatBlock label="Giá trị tồn kho" value={formatPrice(inventoryValue)} />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-neutral-950">{value}</div>
    </div>
  );
}
