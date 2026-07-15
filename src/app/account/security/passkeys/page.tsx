"use client";

import { startRegistration } from "@simplewebauthn/browser";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Fingerprint, Loader2, Plus, Trash2 } from "lucide-react";

type PasskeyItem = {
  id: string;
  name: string;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export default function PasskeysPage() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPasskeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/passkeys", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/account/login?next=/account/security/passkeys";
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải passkey.");
      setPasskeys(payload.passkeys);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải passkey.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => void loadPasskeys(), [loadPasskeys]);

  async function addPasskey() {
    setIsAdding(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
      });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error || "Không thể tạo passkey.");
      const registrationResponse = await startRegistration({ optionsJSON: options });
      const verifyResponse = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error || "Không thể lưu passkey.");
      await loadPasskeys();
    } catch (addError) {
      setError(
        addError instanceof Error && addError.name !== "NotAllowedError"
          ? addError.message
          : "Bạn đã hủy hoặc trình duyệt này chưa hỗ trợ passkey.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function removePasskey(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch("/api/auth/passkeys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể xóa passkey.");
      setPasskeys((current) => current.filter((item) => item.id !== id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Không thể xóa passkey.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-20 text-[#3b170c]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5">
        <header className="flex items-center gap-3">
          <Link href="/account" className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#7a4b31] shadow-sm" aria-label="Quay lại tài khoản">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black">Passkey</h1>
            <p className="text-xs font-semibold text-[#8b6a58]">Đăng nhập bằng vân tay, khuôn mặt hoặc khóa màn hình.</p>
          </div>
        </header>

        <section className="mt-5 rounded-[18px] border border-[#efdaca] bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7eb] text-[#34802f]">
              <Fingerprint className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold leading-5 text-[#80685b]">
              Passkey không tiết lộ sinh trắc học cho tiệm. Một số trình duyệt trong Facebook hoặc Messenger có thể yêu cầu mở Chrome/Safari.
            </p>
          </div>
        </section>

        {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}

        <button type="button" onClick={addPasskey} disabled={isAdding} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#b84a39] text-sm font-black text-white disabled:opacity-60">
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Thêm passkey
        </button>

        <section className="mt-4 space-y-2.5">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : passkeys.length === 0 ? (
            <p className="rounded-2xl border border-[#eddbce] bg-white p-4 text-center text-sm font-semibold text-[#80685b]">Chưa có passkey nào.</p>
          ) : passkeys.map((passkey) => (
            <article key={passkey.id} className="flex items-center gap-3 rounded-2xl border border-[#eddbce] bg-white p-3">
              <Fingerprint className="h-5 w-5 shrink-0 text-[#a44c36]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{passkey.name}</p>
                <p className="text-xs font-semibold text-[#8b6a58]">
                  {passkey.backedUp ? "Có đồng bộ" : "Trên thiết bị"} · tạo {formatDate(passkey.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => removePasskey(passkey.id)} disabled={busyId === passkey.id} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-700" aria-label={`Xóa ${passkey.name}`}>
                {busyId === passkey.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}
