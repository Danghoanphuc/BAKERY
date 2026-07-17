import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserRound, UserRoundPlus, X } from "lucide-react";
import type { PosCustomer, PosCustomerSummary } from "../_lib/pos-utils";

type PosCustomerBoxProps = {
  customer: PosCustomer;
  onCustomerChange: (customer: PosCustomer) => void;
};

export function PosCustomerBox({
  customer,
  onCustomerChange,
}: PosCustomerBoxProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCustomer = Boolean(
    customer.id || customer.name.trim() || customer.phone.trim(),
  );
  const normalizedQuery = query.trim();
  const queryDigits = normalizedQuery.replace(/\D/g, "").slice(0, 11);
  const isPhoneQuery = !/[^\d\s+().-]/u.test(normalizedQuery);
  const canCreateFromQuery =
    !isLoading &&
    results.length === 0 &&
    (isPhoneQuery ? queryDigits.length >= 8 : normalizedQuery.length >= 2);

  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || normalizedQuery.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/pos/customers/search?q=${encodeURIComponent(normalizedQuery)}`,
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
  }, [isSearchOpen, normalizedQuery]);

  function closeSearch() {
    setIsSearchOpen(false);
    setQuery("");
    setResults([]);
  }

  function selectCustomer(nextCustomer: PosCustomer) {
    onCustomerChange(nextCustomer);
    closeSearch();
  }

  function useNewCustomer() {
    if (!canCreateFromQuery) return;
    selectCustomer({
      name: isPhoneQuery ? "" : normalizedQuery,
      phone: isPhoneQuery ? queryDigits : "",
    });
  }

  if (isSearchOpen) {
    return (
      <section className="space-y-2 rounded-2xl border border-[#eadbcc] bg-[#fffaf6] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b6254]">
              Tìm khách hàng
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#9b8171]">
              Số điện thoại hoặc tên khách
            </p>
          </div>
          <button
            type="button"
            onClick={closeSearch}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#9b8171] transition hover:bg-white hover:text-[#b84a39]"
            aria-label="Đóng tìm khách"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (results[0]) selectCustomer(results[0]);
              else useNewCustomer();
            }}
            placeholder="SĐT hoặc tên khách"
            className="h-11 w-full rounded-xl border border-[#eadbcc] bg-white pl-10 pr-10 text-sm font-bold text-[#3d2417] outline-none focus:border-[#b84a39] [&::-webkit-search-cancel-button]:hidden"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#b84a39]" />
          )}
        </label>

        {results.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-[#eadbcc] bg-white p-1 shadow-sm">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCustomer(item)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#fffaf6]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#3d2417]">
                    {item.name}
                  </span>
                  <span className="block text-xs font-semibold text-[#7b6254]">
                    {item.phone}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#fff1f0] px-2 py-1 text-[11px] font-black text-[#b84a39]">
                  {item.loyaltyPoints ?? 0} điểm
                </span>
              </button>
            ))}
          </div>
        )}

        {canCreateFromQuery && (
          <button
            type="button"
            onClick={useNewCustomer}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#b84a39]/30 bg-[#fff1f0] px-3 text-xs font-black text-[#b84a39] transition hover:bg-[#ffe7e4]"
          >
            <UserRoundPlus className="h-4 w-4" />
            Dùng khách mới: {isPhoneQuery ? queryDigits : normalizedQuery}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b6254]">
          Khách hàng
        </p>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex h-11 items-center rounded-xl px-3 text-xs font-black text-[#b84a39] transition hover:bg-[#fff1f0]"
        >
          {hasCustomer ? "Đổi" : "Tìm / Thêm"}
        </button>
      </div>

      <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#eadbcc] bg-[#fffaf6] px-3 py-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#b84a39] shadow-sm">
          <UserRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-[#3d2417]">
            {hasCustomer ? customer.name || "Khách mới" : "Khách lẻ"}
          </p>
          <p className="truncate text-xs font-semibold text-[#7b6254]">
            {hasCustomer
              ? [customer.phone, customer.tier, `${customer.loyaltyPoints ?? 0} điểm`]
                  .filter(Boolean)
                  .join(" · ")
              : "Không tích điểm thành viên"}
          </p>
        </div>
        {hasCustomer && (
          <button
            type="button"
            onClick={() => onCustomerChange({ name: "", phone: "" })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#9b8171] transition hover:bg-white hover:text-[#b84a39]"
            aria-label="Bỏ khách"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
