import { Package, Edit2, Trash2, Check, X } from "lucide-react";

interface WholesaleProduct {
  id: string;
  productId: string;
  productName: string;
  wholesalePrice: number;
  minimumOrderQuantity: number;
  stock: number;
  isAvailable: boolean;
  tierDiscounts?: {
    silver?: number;
    gold?: number;
    platinum?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface WholesaleProductTableProps {
  products: WholesaleProduct[];
  isLoading: boolean;
  onEditProduct: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
}

export function WholesaleProductTable({
  products,
  isLoading,
  onEditProduct,
  onDeleteProduct,
  onToggleAvailability,
}: WholesaleProductTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#7b6254]">Đang tải danh sách sản phẩm sỉ...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <div className="flex justify-center">
          <Package className="h-12 w-12 text-[#7b6254]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#7b6254]">Chưa có sản phẩm sỉ nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0e1d2] bg-white">
      <table className="w-full">
        <thead className="bg-[#fffaf6]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Sản phẩm
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Giá sỉ
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Số lượng tối thiểu
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tồn kho
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Chiết khấu theo tier
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Trạng thái
            </th>
            <th className="px-5 py-3 text-right text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e1d2]">
          {products.map((product) => (
            <tr key={product.id} className="transition hover:bg-[#fffaf6]">
              <td className="px-5 py-4">
                <p className="font-semibold text-[#3d2417]">{product.productName}</p>
                <p className="mt-1 text-xs text-[#9b8171]">ID: {product.productId}</p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[#3d2417]">
                  {formatCurrency(product.wholesalePrice)}
                </p>
              </td>
              <td className="px-5 py-4 text-sm text-[#7b6254]">
                {product.minimumOrderQuantity}
              </td>
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[#3d2417]">{product.stock}</p>
              </td>
              <td className="px-5 py-4 text-xs text-[#7b6254]">
                <div className="space-y-1">
                  {product.tierDiscounts?.silver !== undefined && (
                    <p>Bạc: {product.tierDiscounts.silver}%</p>
                  )}
                  {product.tierDiscounts?.gold !== undefined && (
                    <p>Vàng: {product.tierDiscounts.gold}%</p>
                  )}
                  {product.tierDiscounts?.platinum !== undefined && (
                    <p>Bạch kim: {product.tierDiscounts.platinum}%</p>
                  )}
                  {!product.tierDiscounts && <p className="text-gray-400">Không có</p>}
                </div>
              </td>
              <td className="px-5 py-4">
                <button
                  onClick={() => onToggleAvailability(product.id, !product.isAvailable)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    product.isAvailable
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {product.isAvailable ? (
                    <>
                      <Check className="h-3 w-3" />
                      Có sẵn
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      Hết hàng
                    </>
                  )}
                </button>
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEditProduct(product.id)}
                    className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2] hover:text-[#b84a39]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
