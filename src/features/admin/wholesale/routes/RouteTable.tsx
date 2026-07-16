import { Truck, Edit2, Trash2, Check, X, Calendar, User, Phone } from "lucide-react";

interface DeliveryRoute {
  id: string;
  name: string;
  description?: string;
  dealerIds: string[];
  scheduleDays: number[];
  isActive: boolean;
  driver?: string;
  driverPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteTableProps {
  routes: DeliveryRoute[];
  isLoading: boolean;
  onEditRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function RouteTable({
  routes,
  isLoading,
  onEditRoute,
  onDeleteRoute,
  onToggleActive,
}: RouteTableProps) {
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const getScheduleDays = (days: number[]) => {
    return days.map(day => dayNames[day]).join(", ");
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#7b6254]">Đang tải danh sách tuyến đường...</p>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <div className="flex justify-center">
          <Truck className="h-12 w-12 text-[#7b6254]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#7b6254]">Chưa có tuyến đường nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0e1d2] bg-white">
      <table className="w-full">
        <thead className="bg-[#fffaf6]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tuyến đường
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Lịch giao
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tài xế
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Số đại lý
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
          {routes.map((route) => (
            <tr key={route.id} className="transition hover:bg-[#fffaf6]">
              <td className="px-5 py-4">
                <div>
                  <p className="font-semibold text-[#3d2417]">{route.name}</p>
                  {route.description && (
                    <p className="mt-1 text-xs text-[#9b8171]">{route.description}</p>
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#7b6254]" />
                  <span className="text-sm text-[#3d2417]">{getScheduleDays(route.scheduleDays)}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                {route.driver ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#7b6254]" />
                      <p className="text-sm text-[#3d2417]">{route.driver}</p>
                    </div>
                    {route.driverPhone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3 text-[#7b6254]" />
                        <p className="text-xs text-[#9b8171]">{route.driverPhone}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Chưa gán</p>
                )}
              </td>
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[#3d2417]">{route.dealerIds.length}</p>
              </td>
              <td className="px-5 py-4">
                <button
                  onClick={() => onToggleActive(route.id, !route.isActive)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    route.isActive
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {route.isActive ? (
                    <>
                      <Check className="h-3 w-3" />
                      Hoạt động
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      Ngừng
                    </>
                  )}
                </button>
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEditRoute(route.id)}
                    className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2] hover:text-[#b84a39]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteRoute(route.id)}
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
