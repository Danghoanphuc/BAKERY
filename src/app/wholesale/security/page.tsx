"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

type SecurityEvent = {
  id: string;
  eventType: string;
  channel: string;
  subjectKinds: string[];
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};

const labels: Record<string, string> = {
  pin_failed: "Sai PIN",
  login_succeeded: "Đăng nhập PIN",
  registration_created: "Tạo tài khoản",
  order_created: "Tạo đơn",
  cod_order_created: "Đơn COD",
  voucher_redeemed: "Dùng voucher",
  challenge_failed: "Challenge thất bại",
  challenge_passed: "Challenge thành công",
  passkey_registered: "Đăng ký passkey",
  passkey_login_succeeded: "Đăng nhập passkey",
};

export default function AdminSecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wholesale/security/events", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không thể tải nhật ký.");
        setEvents(payload.events);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Không thể tải nhật ký."),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const summary = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60_000;
    const recent = events.filter((event) => new Date(event.createdAt).getTime() >= since);
    return {
      total: recent.length,
      failedPin: recent.filter((event) => event.eventType === "pin_failed").length,
      challenged: recent.filter((event) => event.eventType.startsWith("challenge_")).length,
    };
  }, [events]);

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black text-[#3d2417]">
          <ShieldCheck className="h-6 w-6 text-[#b84a39]" /> An toàn hệ thống
        </h1>
        <p className="mt-1 text-sm font-semibold text-[#80685b]">Tín hiệu đã ẩn danh; không hiển thị IP, số điện thoại hay địa chỉ thô.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Sự kiện 24 giờ" value={summary.total} />
        <Metric label="PIN sai 24 giờ" value={summary.failedPin} warning={summary.failedPin > 10} />
        <Metric label="Challenge 24 giờ" value={summary.challenged} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#eadbcc] bg-white">
        <div className="border-b border-[#f0e1d2] px-4 py-3 text-sm font-black">150 sự kiện gần nhất</div>
        {isLoading ? <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div> : null}
        {error ? <p className="p-4 text-sm font-bold text-red-700">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="divide-y divide-[#f4e8df]">
            {events.map((event) => (
              <article key={event.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-[#3d2417]">{labels[event.eventType] || event.eventType}</span>
                  <span className="block text-xs font-semibold text-[#8b6a58]">{event.channel} · {event.subjectKinds.join(", ")}</span>
                </span>
                <time className="shrink-0 text-xs font-semibold text-[#8b6a58]">{new Date(event.createdAt).toLocaleString("vi-VN")}</time>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <article className="rounded-2xl border border-[#eadbcc] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-[#80685b]">
        {warning ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}{label}
      </div>
      <p className="mt-1 text-2xl font-black text-[#3d2417]">{value}</p>
    </article>
  );
}
