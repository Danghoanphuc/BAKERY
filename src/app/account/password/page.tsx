"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

function PasswordPageContent() {
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMe() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        window.location.href = "/account/login?next=/account/password";
        return;
      }
      const data = await response.json();
      setHasPassword(Boolean(data.customer.hasPassword));
      setIsLoading(false);
    }

    loadMe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Mat khau nhap lai chua khop.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Khong the cap nhat mat khau.");
        return;
      }

      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Da cap nhat mat khau.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef]">
        <Loader2 className="h-6 w-6 animate-spin text-[#d85d6c]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#d85d6c] text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight">
            {hasPassword ? "Doi mat khau" : "Dat mat khau"}
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#7b6254]">
            Mat khau giup ban chu dong dang nhap sau nay, khong can xin lai
            magic link moi lan.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]"
        >
          {hasPassword && (
            <PasswordField
              label="Mat khau hien tai"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
          )}
          <PasswordField
            label="Mat khau moi"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            label="Nhap lai mat khau moi"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70"
          >
            {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
            Luu mat khau
          </button>
        </form>

        <Link
          href="/profile"
          className="mt-4 text-center text-sm font-bold text-[#7b6254]"
        >
          Ve ho so
        </Link>
      </div>
    </main>
  );
}

export default function PasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordPageContent />
    </Suspense>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-[#7b4b34]">
        {label}
      </span>
      <input
        type="password"
        value={value}
        required
        minLength={8}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-[#eadbcc] bg-[#fffaf6] px-3 text-[15px] font-semibold outline-none focus:border-[#d85d6c]"
      />
    </label>
  );
}
