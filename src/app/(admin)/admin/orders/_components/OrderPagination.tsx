import { ChevronLeft, ChevronRight } from "lucide-react";

type OrderPaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
};

export function OrderPagination(props: OrderPaginationProps) {
  if (props.total <= props.pageSize && !props.hasMore) return null;

  const start = (props.page - 1) * props.pageSize + 1;
  const end = Math.min(props.page * props.pageSize, props.total);

  return (
    <nav
      aria-label="Phân trang đơn hàng"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
    >
      <p className="text-sm text-neutral-600">
        Hiển thị {start}–{end} trong {props.total} đơn
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Trang trước"
          onClick={() => props.onPageChange(props.page - 1)}
          disabled={props.page === 1}
          className="rounded-md border border-neutral-200 p-2 text-neutral-600 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-20 text-center text-sm font-semibold text-neutral-700">
          Trang {props.page}/{props.pageCount}
        </span>
        <button
          type="button"
          aria-label="Trang sau"
          onClick={() => props.onPageChange(props.page + 1)}
          disabled={props.page === props.pageCount}
          className="rounded-md border border-neutral-200 p-2 text-neutral-600 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {props.hasMore && props.page === props.pageCount && (
          <button
            type="button"
            onClick={() => void props.onLoadMore()}
            disabled={props.isLoadingMore}
            className="ml-1 rounded-md border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 disabled:opacity-50"
          >
            {props.isLoadingMore ? "Đang tải…" : "Tải thêm đơn cũ"}
          </button>
        )}
      </div>
    </nav>
  );
}
