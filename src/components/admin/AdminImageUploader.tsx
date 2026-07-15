"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ChangeEvent, useState } from "react";

export function AdminImageUploader({ value, onChange, label = "Ảnh", aspect = "square" }: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: "square" | "landscape";
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true); setError(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/uploads/cloudinary", { method: "POST", body });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) throw new Error(result?.error || "Không thể tải ảnh.");
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh.");
    } finally { setIsUploading(false); }
  }

  return <div>
    <p className="mb-1.5 text-xs font-black text-neutral-600">{label}</p>
    <div className={`relative overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 ${aspect === "square" ? "aspect-square" : "aspect-[16/9]"}`}>
      {value ? <Image src={value} alt={label} fill className="object-cover" /> : <div className="absolute inset-0 grid place-items-center text-neutral-400"><ImagePlus className="h-8 w-8" /></div>}
      <label className="absolute inset-x-2 bottom-2 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/95 text-xs font-black text-neutral-800 shadow-sm">
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{isUploading ? "Đang tải..." : value ? "Đổi ảnh" : "Chọn ảnh"}
        <input type="file" accept="image/*" onChange={upload} disabled={isUploading} className="sr-only" />
      </label>
      {value && <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-red-600 shadow" aria-label="Xóa ảnh"><Trash2 className="h-4 w-4" /></button>}
    </div>
    {error && <p className="mt-1 text-xs font-bold text-red-600">{error}</p>}
  </div>;
}
