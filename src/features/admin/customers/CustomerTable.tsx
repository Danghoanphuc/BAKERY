import { BadgeCheck, Search } from "lucide-react";

import type { CustomerRiskLevel } from "@/types";
import {
  formatCurrency,
  formatDateTime,
  riskClasses,
  riskLabels,
  type CustomerFilters,
  type CustomerRow,
} from "./customer-crm-utils";

type CustomerTableProps = {
  filters: CustomerFilters;
  isLoading: boolean;
  rows: CustomerRow[];
  onFiltersChange: (filters: CustomerFilters) => void;
  onOpenCustomer: (id: string) => void;
};

export function CustomerTable({
  filters,
  isLoading,
  rows,
  onFiltersChange,
  onOpenCustomer,
}: CustomerTableProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={filters.query}
              onChange={(event) =>
                onFiltersChange({ ...filters, query: event.target.value })
              }
              placeholder="Tìm theo tên, số điện thoại, email hoặc tag"
              className="h-10 w-full rounded-lg border border-neutral-300 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <select
            value={filters.risk}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                risk: event.target.value as "all" | CustomerRiskLevel,
              })
            }
            className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">Tất cả luồng</option>
            <option value="green">Luồng xanh</option>
            <option value="yellow">Luồng vàng</option>
            <option value="red">Luồng đỏ</option>
          </select>
          <select
            value={filters.verification}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                verification: event.target.value as CustomerFilters["verification"],
              })
            }
            className="h-10 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">Tất cả xác minh</option>
            <option value="verified">Đã xác minh</option>
            <option value="unverified">Chưa xác minh</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Khách hàng
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Luồng
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Mua hàng
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-neutral-500">
                  Đang tải khách hàng...
                </td>
              </tr>
            )}

            {!isLoading &&
              rows.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => onOpenCustomer(customer.id)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-sm font-bold text-neutral-700">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-950">{customer.name}</p>
                          {customer.phoneVerifiedAt && (
                            <BadgeCheck className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-neutral-600">{customer.phone}</p>
                        {customer.email && (
                          <p className="text-xs text-neutral-500">{customer.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClasses[customer.trafficRisk]}`}
                    >
                      {riskLabels[customer.trafficRisk]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-neutral-950">
                      {formatCurrency(customer.lifetimeValue)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {customer.orderCount} đơn,{" "}
                      {customer.loyaltyPoints.toLocaleString("vi-VN")} điểm
                    </p>
                    <p className="text-xs text-neutral-500">
                      Gần nhất: {formatDateTime(customer.lastOrderAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-600">
                    {customer.phoneVerifiedAt ? "Đã xác minh số" : "Chưa xác minh số"}
                  </td>
                </tr>
              ))}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-neutral-500">
                  Không có khách hàng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
