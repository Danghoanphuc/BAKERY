import { Filter, Search } from "lucide-react";
import { tabs, statuses } from "../_lib/constants";
import type { TabFilter, StatusFilter, DateFilter } from "../_lib/constants";

type OrderFiltersProps = {
  query: string;
  setQuery: (query: string) => void;
  activeTab: TabFilter;
  setActiveTab: (tab: TabFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (date: DateFilter) => void;
  filteredCount: number;
};

export function OrderFilters(props: OrderFiltersProps) {
  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              aria-label="Tìm kiếm đơn hàng"
              placeholder="Tìm mã đơn, tên khách, số điện thoại..."
              className="h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <Select
            label="Lọc theo trạng thái"
            value={props.statusFilter}
            onChange={(value) => props.setStatusFilter(value as StatusFilter)}
            options={[
              ["all", "Tất cả trạng thái"],
              ...statuses.map(
                (status) => [status.value, status.label] as [string, string],
              ),
            ]}
          />
          <Select
            label="Lọc theo thời gian"
            value={props.dateFilter}
            onChange={(value) => props.setDateFilter(value as DateFilter)}
            options={[
              ["all", "Mọi thời gian"],
              ["today", "Hôm nay"],
              ["upcoming", "Sắp tới"],
              ["overdue", "Quá hạn"],
            ]}
          />
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-600">
            <Filter className="h-4 w-4" />
            {props.filteredCount} đơn
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-200">
        <nav aria-label="Loại đơn hàng" className="-mb-px flex flex-wrap gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => props.setActiveTab(tab.id)}
              type="button"
              aria-current={props.activeTab === tab.id ? "page" : undefined}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                props.activeTab === tab.id
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
    >
      {options.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}
