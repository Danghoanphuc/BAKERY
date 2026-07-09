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
    <div className="rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] px-4 py-3 shadow-[0_14px_34px_rgba(61,36,23,0.06)]">
      <div className="text-xs font-black uppercase text-[#9b8171]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[#3d2417]">{value}</div>
    </div>
  );
}
