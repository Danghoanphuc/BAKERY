"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  Heart,
  ImageIcon,
  MessageCircle,
  Palette,
  Shapes,
  ShieldCheck,
  Sparkles,
  Type,
  XCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_ASSETS, BRAND_COLORS, BRAND_META, BRAND_TRAITS } from "@/lib/brand";

const voiceExamples = [
  { title: "Ấm áp", description: "Nói như một lời mời chân thành, gần gũi và có cảm xúc.", example: "Một chiếc bánh nhỏ, một niềm vui thật to." },
  { title: "Vui tươi", description: "Tích cực, nhẹ nhàng; không khoa trương hoặc dùng quá nhiều dấu cảm thán.", example: "Hôm nay mình cùng ăn ngọt một chút nhé." },
  { title: "Tinh tế", description: "Ngắn gọn, có chủ đích và tôn trọng chất lượng thủ công.", example: "Nướng mới mỗi ngày, chăm chút trong từng lớp bánh." },
] as const;

export default function BrandGuidelinesPage() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyColor(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      window.setTimeout(() => setCopied((current) => current === hex ? null : current), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-5 pb-16">
      <header className="relative overflow-hidden rounded-xl border border-[#dfe5e8] bg-[#fffdf9] px-5 py-6 shadow-[0_8px_24px_rgba(18,62,102,0.06)] sm:px-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#f07a58]/12" />
        <div className="pointer-events-none absolute right-20 top-8 h-16 w-16 rounded-full bg-[#2f8d88]/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e3f1ee] text-[#2f8d88]"><Palette className="h-[18px] w-[18px]" /></span>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f8d88]">Brand Guidelines · Version {BRAND_META.version}</p>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#123e66] sm:text-4xl">SweetTime</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647078]">Thư viện tham chiếu nội bộ giúp mọi điểm chạm của thương hiệu luôn ấm áp, vui tươi và tinh tế.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Tính cách thương hiệu">
            {BRAND_TRAITS.map((trait) => <span key={trait} className="rounded-full border border-[#dfe5e8] bg-white px-3 py-1.5 text-xs font-black text-[#123e66]">{trait}</span>)}
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="color-system-title">
        <SectionHeading icon={Palette} eyebrow="01 · Color system" title="Bảng màu thương hiệu" description="Dùng màu chính để nhận diện, màu phụ để tạo chiều sâu. Nhấn vào một ô để sao chép mã HEX." id="color-system-title" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((color) => (
            <button key={color.hex} type="button" onClick={() => copyColor(color.hex)} className="group overflow-hidden rounded-xl border border-[#dfe5e8] bg-[#fffdf9] text-left transition hover:-translate-y-0.5 hover:shadow-md" aria-label={`Sao chép màu ${color.name} ${color.hex}`}>
              <span className={`flex h-24 items-end justify-between p-3 ${color.foreground === "light" ? "text-white" : "text-[#123e66]"}`} style={{ backgroundColor: color.hex }}>
                <span className="text-xs font-black uppercase tracking-[0.08em]">{color.hex}</span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-black/10 backdrop-blur-sm">{copied === color.hex ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</span>
              </span>
              <span className="block p-3"><strong className="block text-sm text-[#123e66]">{color.name}</strong><span className="mt-1 block text-xs text-[#6f777b]">{color.role}</span></span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">{copied ? `Đã sao chép ${copied}` : ""}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="type-title">
          <SectionHeading icon={Type} eyebrow="02 · Typography" title="Hệ chữ" description="Ưu tiên rõ ràng trong vận hành, thêm chất thủ công ở những điểm nhấn có chủ đích." id="type-title" />
          <div className="mt-5 space-y-3">
            <TypeSample label="Display / Script" meta="Dancing Script · Bold" className="font-dancing-script text-4xl text-[#d94a34]" text="Sweet Moments" />
            <TypeSample label="Heading" meta="Be Vietnam Pro · 800–900" className="text-2xl font-black tracking-[-0.025em] text-[#123e66]" text="Bake Joy, Share Time" />
            <TypeSample label="Body" meta="Be Vietnam Pro · 400–600" className="text-sm leading-6 text-[#4f595f]" text="Bánh thủ công được nướng mới mỗi ngày, dành cho những khoảnh khắc sẻ chia." />
          </div>
        </section>

        <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="logo-title">
          <SectionHeading icon={Heart} eyebrow="03 · Logo & wordmark" title="Dấu hiệu nhận diện" description="Giữ wordmark thoáng, tương phản tốt và không thêm hiệu ứng trang trí." id="logo-title" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="grid min-h-36 place-items-center rounded-xl bg-[#f4ebdd] p-5"><BrandLogo className="w-full max-w-[330px]" /></div>
            <div className="grid min-h-36 place-items-center rounded-xl bg-[#123e66] p-5"><BrandLogo variant="reverse" className="w-full max-w-[330px]" /></div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#f3f6f7] p-3 text-xs leading-5 text-[#5f686d]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8d88]" /><p>Khoảng trống an toàn tối thiểu bằng chiều cao chữ “S”. Không kéo giãn, xoay hoặc đổi màu ngoài bảng màu chuẩn.</p></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{BRAND_ASSETS.map((asset) => <a key={asset.href} href={asset.href} download={asset.fileName} className="inline-flex h-10 items-center justify-between rounded-lg border border-[#dfe5e8] bg-white px-3 text-xs font-black text-[#123e66] transition hover:border-[#2f8d88] hover:bg-[#f3f8f7]"><span>{asset.label}</span><Download className="h-4 w-4 text-[#2f8d88]" /></a>)}</div>
        </section>
      </div>

      <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="voice-title">
        <SectionHeading icon={MessageCircle} eyebrow="04 · Tone of voice" title="Giọng điệu thương hiệu" description="Viết như một người làm bánh tận tâm đang trò chuyện với khách quen." id="voice-title" />
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {voiceExamples.map((item, index) => <article key={item.title} className="rounded-xl border border-[#dfe5e8] bg-[#fffdf9] p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff1ed] text-sm font-black text-[#d94a34]">0{index + 1}</span><h3 className="mt-4 font-black text-[#123e66]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#647078]">{item.description}</p><p className="mt-4 border-l-2 border-[#f07a58] pl-3 text-sm font-bold italic text-[#2d2a28]">“{item.example}”</p></article>)}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="imagery-title">
          <SectionHeading icon={ImageIcon} eyebrow="05 · Imagery" title="Định hướng hình ảnh" description="Để sản phẩm và khoảnh khắc thật dẫn dắt câu chuyện." id="imagery-title" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ icon: "🍰", label: "Bánh & tráng miệng" }, { icon: "🥐", label: "Bánh nướng mới" }, { icon: "☕", label: "Trà & cà phê" }, { icon: "🤝", label: "Khoảnh khắc sẻ chia" }].map((item) => <div key={item.label} className="rounded-xl bg-[#f4ebdd] p-4 text-center"><span className="text-3xl" aria-hidden="true">{item.icon}</span><p className="mt-3 text-xs font-black leading-5 text-[#123e66]">{item.label}</p></div>)}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#647078]">Ưu tiên ánh sáng tự nhiên, màu thực phẩm chân thật, bề mặt thủ công và cảm giác ấm. Tránh ảnh quá bóng, tương phản gắt hoặc bố cục mang tính công nghiệp.</p>
        </section>

        <section className="rounded-xl border border-[#dfe5e8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="motif-title">
          <SectionHeading icon={Shapes} eyebrow="06 · Motif & usage" title="Motif và nguyên tắc dùng" description="Dùng điểm nhấn tiết chế để thương hiệu luôn có nhịp thở." id="motif-title" />
          <div className="mt-5 flex h-20 items-center justify-center gap-4 overflow-hidden rounded-xl bg-[#fff7f0]">
            <Heart className="h-8 w-8 fill-[#d94a34] text-[#d94a34]" /><Sparkles className="h-7 w-7 text-[#2f8d88]" /><span className="h-6 w-20 rounded-[50%_20%_50%_20%] bg-[#f07a58]" /><span className="h-6 w-14 rounded-full bg-[#123e66]" /><Heart className="h-5 w-5 fill-[#d94a34] text-[#d94a34]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UsageList title="Nên" icon={CheckCircle2} tone="good" items={["Dùng nền kem để tạo độ ấm", "Giữ tương phản chữ dễ đọc", "Chỉ dùng 1–2 motif mỗi khung"]} />
            <UsageList title="Không nên" icon={XCircle} tone="bad" items={["Phủ quá nhiều màu nhấn", "Biến dạng logo hoặc wordmark", "Dùng motif thay cho nội dung chính"]} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, description, id }: { icon: typeof Palette; eyebrow: string; title: string; description: string; id: string }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e3f1ee] text-[#2f8d88]"><Icon className="h-[18px] w-[18px]" /></span><div><p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#d94a34]">{eyebrow}</p><h2 id={id} className="mt-1 text-xl font-black tracking-[-0.02em] text-[#123e66]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#6f777b]">{description}</p></div></div>;
}

function TypeSample({ label, meta, className, text }: { label: string; meta: string; className: string; text: string }) {
  return <div className="rounded-xl border border-[#dfe5e8] bg-[#fffdf9] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#2f8d88]">{label}</p><span className="text-[11px] font-bold text-[#8a9499]">{meta}</span></div><p className={`mt-3 ${className}`}>{text}</p></div>;
}

function UsageList({ title, icon: Icon, tone, items }: { title: string; icon: typeof CheckCircle2; tone: "good" | "bad"; items: string[] }) {
  const styles = tone === "good" ? "bg-[#f3f8f7] text-[#2f8d88]" : "bg-[#fff5f2] text-[#d94a34]";
  return <div className={`rounded-xl p-4 ${styles}`}><div className="flex items-center gap-2"><Icon className="h-5 w-5" /><h3 className="font-black text-[#123e66]">{title}</h3></div><ul className="mt-3 space-y-2 text-xs leading-5 text-[#566168]">{items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul></div>;
}
