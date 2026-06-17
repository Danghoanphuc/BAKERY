"use client";

import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react";

const stats = [
  {
    id: "orders",
    label: "Đơn hàng hôm nay",
    value: "24",
    change: "+12%",
    changeType: "positive" as const,
    icon: ShoppingBag,
  },
  {
    id: "revenue",
    label: "Doanh thu",
    value: "15.2M",
    change: "+8%",
    changeType: "positive" as const,
    icon: TrendingUp,
  },
  {
    id: "products",
    label: "Sản phẩm",
    value: "48",
    change: "+3",
    changeType: "neutral" as const,
    icon: Package,
  },
  {
    id: "customers",
    label: "Khách hàng",
    value: "1,234",
    change: "+15%",
    changeType: "positive" as const,
    icon: Users,
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tổng quan</h1>
        <p className="text-neutral-600 mt-1">
          Xem nhanh tình hình kinh doanh hôm nay
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : "text-neutral-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-neutral-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-neutral-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-neutral-900">
              Xem đơn hàng mới
            </span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <Package className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-neutral-900">
              Thêm sản phẩm mới
            </span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-neutral-900">Xem báo cáo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
