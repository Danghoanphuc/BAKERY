"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Laptop,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

type SessionItem = {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

export default function AccountSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sessions", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/account/login?next=/account/security/sessions";
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Không thể tải phiên.");
      setSessions(payload.sessions as SessionItem[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách thiết bị.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function revokeSession(session: SessionItem) {
    setBusyId(session.id);
    setError(null);
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Không thể thu hồi phiên.");
      if (payload.revokedCurrent) {
        window.location.href = "/account/login";
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Không thể thu hồi phiên.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function revokeOtherSessions() {
    setBusyId("others");
    setError(null);
    try {
      const response = await fetch("/api/auth/sessions", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Không thể thu hồi phiên.");
      setSessions((current) => current.filter((session) => session.current));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Không thể thu hồi các phiên khác.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-28 text-[#3b170c]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5">
        <header className="flex items-center gap-3">
          <Link
            href="/account"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#7a4b31] shadow-sm"
            aria-label="Quay lại tài khoản"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black">Thiết bị đăng nhập</h1>
            <p className="text-xs font-semibold text-[#8b6a58]">
              Kiểm tra và thu hồi các phiên không còn sử dụng.
            </p>
          </div>
        </header>

        <section className="mt-5 rounded-[18px] border border-[#efdaca] bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#edf7eb] text-[#34802f]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black">Mỗi trình duyệt là một phiên riêng</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#80685b]">
                Facebook, Messenger và Zalo có thể tạo nhiều vùng đăng nhập độc lập trên cùng điện thoại.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <p role="alert" className="mt-3 rounded-[12px] bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        <section className="mt-4 space-y-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-[#80685b]">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thiết bị...
            </div>
          ) : (
            sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-[16px] border border-[#eddbce] bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#fff4ea] text-[#a44c36]">
                    {session.deviceLabel.includes("Windows") ||
                    session.deviceLabel.includes("macOS") ? (
                      <Laptop className="h-5 w-5" />
                    ) : (
                      <Smartphone className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black">{session.deviceLabel}</p>
                      {session.current ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Phiên này
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#8b6a58]">
                      Hoạt động {formatSessionTime(session.lastSeenAt)}
                    </p>
                  </div>
                  {!session.current ? (
                    <button
                      type="button"
                      onClick={() => revokeSession(session)}
                      disabled={busyId === session.id}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-red-50 text-red-700 disabled:opacity-50"
                      aria-label={`Đăng xuất ${session.deviceLabel}`}
                    >
                      {busyId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>

        {sessions.some((session) => !session.current) ? (
          <button
            type="button"
            onClick={revokeOtherSessions}
            disabled={busyId !== null}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border border-red-200 bg-white text-sm font-black text-red-700 disabled:opacity-50"
          >
            {busyId === "others" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Đăng xuất tất cả thiết bị khác
          </button>
        ) : null}
      </div>
    </main>
  );
}

function formatSessionTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "gần đây";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
