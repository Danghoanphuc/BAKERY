import Link from "next/link";
import { ArrowRight, Building2, TrendingUp, AlertCircle, Truck } from "lucide-react";

export default function WholesaleDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
          Wholesale CRM
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">
          Quản lý bán sỉ & Đại lý
        </h1>
        <p className="mt-2 text-sm text-[#7b6254]">
          Quản lý đại lý, công nợ, sản phẩm sỉ và tuyến giao hàng
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/wholesale/dealers"
          icon={<Building2 className="h-5 w-5" />}
          title="Quản lý đại lý"
          description="Danh sách, phê duyệt, thông tin đại lý"
          color="bg-blue-50 text-blue-600"
        />
        <QuickActionCard
          href="/wholesale/debt"
          icon={<TrendingUp className="h-5 w-5" />}
          title="Quản lý công nợ"
          description="Hạn mức, lịch sử, cảnh báo quá hạn"
          color="bg-amber-50 text-amber-600"
        />
        <QuickActionCard
          href="/wholesale/products"
          icon={<AlertCircle className="h-5 w-5" />}
          title="Sản phẩm sỉ"
          description="Giá sỉ, tồn kho, sản phẩm riêng"
          color="bg-green-50 text-green-600"
        />
        <QuickActionCard
          href="/wholesale/routes"
          icon={<Truck className="h-5 w-5" />}
          title="Đi tuyến"
          description="Tuyến đường, lịch giao hàng"
          color="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}>
          {icon}
        </span>
        <ArrowRight className="h-4 w-4 text-[#c5aa99] transition group-hover:translate-x-1 group-hover:text-[#b84a39]" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#3d2417]">{title}</p>
      <p className="mt-1 text-xs text-[#7b6254]">{description}</p>
    </Link>
  );
}
