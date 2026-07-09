import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserRound, X } from "lucide-react";
import type { PosCustomer, PosCustomerSummary } from "../_lib/pos-utils";

type PosCustomerBoxProps = {
  customer: PosCustomer;
  onCustomerChange: (customer: PosCustomer) => void;
};

export function PosCustomerBox({
  customer,
  onCustomerChange,
}: PosCustomerBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasSelectedCustomer = Boolean(customer.id);
  const canCreateFromQuery = query.trim().length >= 8 && results.length === 0;

  useEffect(() => {
    if (hasSelectedCustomer || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/pos/customers/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          customers?: PosCustomerSummary[];
        };
        setResults(data.customers ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("POS customer search failed:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [hasSelectedCustomer, query]);

  const helperText = useMemo(() => {
    if (hasSelectedCustomer) return "Khách đã được gắn vào đơn.";
    if (canCreateFromQuery) return "Khách mới sẽ được tạo khi thanh toán.";
    return "Nhập số điện thoại hoặc tên để tìm khách.";
  }, [canCreateFromQuery, hasSelectedCustomer]);

  if (hasSelectedCustomer) {
    return (
      <section className="rounded-2xl border border-[#eadbcc] bg-[#fffaf6] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#d85d6c] shadow-sm">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#3d2417]">
                {customer.name || "Khách hàng"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#7b6254]">
                {customer.phone}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
                <span className="rounded-full bg-white px-2 py-1 text-[#d85d6c]">
                  {customer.loyaltyPoints ?? 0} điểm
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-[#7b6254]">
                  {customer.totalOrders ?? 0} đơn
                </span>
                {customer.tier && (
                  <span className="rounded-full bg-white px-2 py-1 text-[#7b6254]">
                    {customer.tier}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onCustomerChange({ name: "", phone: "" });
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9b8171] transition hover:bg-white hover:text-[#d85d6c]"
            aria-label="Bỏ khách"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b6254]">
          Khách
        </p>
        <p className="text-xs font-bold text-[#9b8171]">Mặc định: khách lẻ</p>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            onCustomerChange({
              name: "",
              phone: value.replace(/\D/g, "").slice(0, 11),
            });
          }}
          placeholder="SĐT hoặc tên khách"
          className="h-11 w-full rounded-xl border border-[#eadbcc] bg-[#fffaf6] pl-10 pr-10 text-sm font-bold text-[#3d2417] outline-none focus:border-[#d85d6c]"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#d85d6c]" />
        )}
      </label>
      <p className="text-xs font-semibold text-[#9b8171]">{helperText}</p>

      {results.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-xl border border-[#eadbcc] bg-white p-1 shadow-sm">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                onCustomerChange(item);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#fffaf6]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#3d2417]">
                  {item.name}
                </span>
                <span className="block text-xs font-semibold text-[#7b6254]">
                  {item.phone}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[#fff1f0] px-2 py-1 text-[11px] font-black text-[#d85d6c]">
                {item.loyaltyPoints ?? 0} điểm
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
