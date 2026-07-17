"use client";

import type { LucideIcon } from "lucide-react";
import {
  CakeSlice,
  CheckCircle2,
  Clipboard,
  Clock3,
  Coffee,
  Croissant,
  Download,
  Gift,
  Heart,
  ImageIcon,
  MapPin,
  MessageCircle,
  Palette,
  Shapes,
  ShieldCheck,
  Sparkles,
  Type,
  Wheat,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  BRAND_ASSETS,
  BRAND_COLORS,
  BRAND_META,
  BRAND_SUPPORT_COLORS,
  BRAND_TRAITS,
} from "@/lib/brand";

const voiceExamples = [
  {
    title: "Ấm áp",
    description: "Trò chuyện như một lời mời chân thành, gần gũi và giàu cảm xúc.",
    example: "Một chiếc bánh nhỏ, một niềm vui thật to.",
  },
  {
    title: "Thân thiện",
    description: "Tích cực, tự nhiên, dễ hiểu; tránh khoa trương hoặc dùng quá nhiều dấu cảm thán.",
    example: "Hôm nay mình cùng dành chút thời gian cho nhau nhé.",
  },
  {
    title: "Thủ công",
    description: "Nhấn vào sự chăm chút, nguyên liệu thật và chất lượng được làm nên mỗi ngày.",
    example: "Nướng mới mỗi ngày, nâng niu trong từng lớp bánh.",
  },
] as const;

const iconSet = [
  { icon: Croissant, label: "Bánh mì" },
  { icon: CakeSlice, label: "Bánh ngọt" },
  { icon: Coffee, label: "Tách trà" },
  { icon: Gift, label: "Quà tặng" },
  { icon: MapPin, label: "Cửa hàng" },
  { icon: Clock3, label: "Thời gian" },
  { icon: Wheat, label: "Lúa mì" },
  { icon: Heart, label: "Yêu thương" },
] as const;

export default function BrandGuidelinesPage() {
  async function copyColor(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`Đã sao chép ${hex}`);
    } catch {
      toast.error("Không thể sao chép mã màu.");
    }
  }

  return (
    <div className="brand-guideline space-y-5 pb-16">
      <header className="brand-guide-hero relative overflow-hidden rounded-2xl border border-[#E7D8C5] bg-[#FFF6E8] px-5 py-7 shadow-[0_12px_32px_rgba(91,55,31,0.08)] sm:px-8 sm:py-9">
        <LeafCorner className="absolute -left-3 -top-3 rotate-[18deg] opacity-70" />
        <LeafCorner className="absolute -right-3 -top-3 -rotate-[72deg] opacity-70" />
        <div className="pointer-events-none absolute right-[18%] top-0 h-full border-l border-dashed border-[#C9A24C]/40" />
        <div className="relative grid gap-7 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="xl:pr-8">
            <BrandLogo className="w-full max-w-[560px]" />
          </div>
          <div className="xl:pl-5">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#C9A24C]">
              <span className="h-px w-10 bg-[#C9A24C]" />
              Cẩm nang thương hiệu · Phiên bản {BRAND_META.version}
            </p>
            <h1 aria-label="SweetTime" className="mt-4 font-serif text-3xl font-bold tracking-[-0.02em] text-[#C24A36] sm:text-4xl">
              {BRAND_META.tagline}
            </h1>
            <div className="mt-4 flex flex-wrap gap-4">
              {BRAND_TRAITS.map((trait, index) => {
                const Icon = [Heart, Wheat, Croissant][index];
                return <span key={trait} className="inline-flex items-center gap-2 text-sm font-extrabold text-[#8A4B27]"><Icon className="h-5 w-5 text-[#C9A24C]" />{trait}</span>;
              })}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#51483F]">
              SweetTime là tiệm bánh và trà ấm cúng, được tạo nên cho những khoảnh khắc đời thường đáng quý. Chúng ta làm bánh chỉn chu, pha trà dịu dàng và đưa mọi người lại gần nhau hơn — từng phút ngọt ngào một.
            </p>
          </div>
        </div>
      </header>

      <section className="guide-card" aria-labelledby="color-system-title">
        <SectionHeading icon={Palette} eyebrow="01 · Hệ màu" title="Bảng màu thương hiệu" description="Màu chính tạo nhận diện; màu hỗ trợ mang lại chiều sâu và cảm giác thủ công. Chạm vào ô màu để sao chép mã HEX." id="color-system-title" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((color) => <ColorCard key={color.hex} color={color} onCopy={copyColor} />)}
        </div>
        <div className="mt-5 grid gap-3 border-t border-[#E8D9C7] pt-5 sm:grid-cols-2 lg:grid-cols-5">
          {BRAND_SUPPORT_COLORS.map((color) => (
            <button key={color.hex} type="button" onClick={() => copyColor(color.hex)} className="group flex items-center gap-3 rounded-xl border border-[#E8D9C7] bg-white/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C9A24C]" aria-label={`Sao chép màu ${color.name} ${color.hex}`}>
              <span className="h-12 w-12 shrink-0 rounded-lg border border-black/5 shadow-inner" style={{ backgroundColor: color.hex }} />
              <span className="min-w-0"><strong className="block text-xs text-[#1F2E4A]">{color.name}</strong><span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-[#8D7460]">{color.hex}</span></span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="guide-card" aria-labelledby="type-title">
          <SectionHeading icon={Type} eyebrow="02 · Kiểu chữ" title="Hệ thống kiểu chữ" description="Kiểu chữ có chân mang chất thủ công cho điểm nhấn; kiểu chữ không chân bảo đảm rõ ràng trong giao diện." id="type-title" />
          <div className="mt-6 space-y-3">
            <TypeSample label="Kiểu chữ trưng bày" meta="Georgia · Đậm" className="font-serif text-4xl font-bold text-[#C24A36] sm:text-5xl" text="Khoảnh khắc ngọt ngào" />
            <TypeSample label="Tiêu đề" meta="Be Vietnam Pro · 800–900" className="text-2xl font-black tracking-[-0.025em] text-[#1F2E4A]" text="Tươi mới mỗi ngày" />
            <TypeSample label="Nội dung" meta="Be Vietnam Pro · 400–600" className="text-sm leading-6 text-[#51483F]" text="Tại SweetTime, những khoảnh khắc nhỏ luôn đáng được nâng niu. Bánh được làm mới mỗi ngày để sẻ chia cùng người bạn thương." />
          </div>
        </section>

        <section className="guide-card" aria-labelledby="logo-title">
          <SectionHeading icon={Heart} eyebrow="03 · Logo" title="Dấu hiệu nhận diện" description="Luôn giữ logo thoáng, đúng tỷ lệ và đủ tương phản trên mọi bề mặt." id="logo-title" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="grid min-h-40 place-items-center rounded-xl border border-[#E8D9C7] bg-[#FFF6E8] p-5"><BrandLogo className="w-full max-w-[340px]" /></div>
            <div className="grid min-h-40 place-items-center rounded-xl bg-[#1F2E4A] p-5"><BrandLogo variant="reverse" className="w-full max-w-[340px]" /></div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#F2E8DA] p-3 text-xs leading-5 text-[#665647]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C24A36]" /><p>Khoảng trống an toàn tối thiểu bằng chiều cao chữ “S”. Không kéo giãn, xoay, thêm bóng hoặc đổi màu ngoài bảng màu chuẩn.</p></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{BRAND_ASSETS.map((asset) => <a key={asset.href} href={asset.href} download={asset.fileName} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-[#E8D9C7] bg-white px-3 text-xs font-black text-[#1F2E4A] transition hover:border-[#C9A24C] hover:bg-[#FFF6E8]"><span>{asset.label}</span><Download className="h-4 w-4 text-[#C24A36]" /></a>)}</div>
        </section>
      </div>

      <section className="guide-card" aria-labelledby="voice-title">
        <SectionHeading icon={MessageCircle} eyebrow="04 · Ngôn từ" title="Giọng điệu thương hiệu" description="Viết như một người làm bánh tận tâm đang trò chuyện với vị khách quen." id="voice-title" />
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {voiceExamples.map((item, index) => (
            <article key={item.title} className="rounded-xl border border-[#E8D9C7] bg-[#FFFCF7] p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F7DBD1] font-serif text-sm font-bold text-[#C24A36]">0{index + 1}</span>
              <h3 className="mt-4 font-serif text-xl font-bold text-[#C24A36]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#665647]">{item.description}</p>
              <p className="mt-4 border-l-2 border-[#C9A24C] pl-3 text-sm font-semibold italic text-[#1F2E4A]">“{item.example}”</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="guide-card" aria-labelledby="imagery-title">
          <SectionHeading icon={ImageIcon} eyebrow="05 · Hình ảnh" title="Định hướng hình ảnh" description="Để sản phẩm thật và những khoảnh khắc sẻ chia dẫn dắt câu chuyện." id="imagery-title" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ icon: Croissant, label: "Mộc mạc & nguyên bản" }, { icon: CakeSlice, label: "Ngon mắt & tinh tế" }, { icon: Coffee, label: "Nghi thức thưởng trà" }, { icon: Heart, label: "Gắn kết & vui vẻ" }].map((item) => <div key={item.label} className="rounded-xl bg-[#F2E8DA] p-4 text-center"><item.icon className="mx-auto h-8 w-8 text-[#C9A24C]" /><p className="mt-3 text-xs font-black leading-5 text-[#1F2E4A]">{item.label}</p></div>)}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#665647]">Ưu tiên ánh sáng tự nhiên, sắc bánh chân thật, chất liệu gỗ, giấy và gốm. Khung hình nên ấm, có khoảng thở và gợi cảm giác đang được mời vào bàn trà.</p>
        </section>

        <section className="guide-card" aria-labelledby="motif-title">
          <SectionHeading icon={Shapes} eyebrow="06 · Ứng dụng" title="Motif và nguyên tắc dùng" description="Dùng chi tiết trang trí tiết chế để thương hiệu luôn có nhịp thở." id="motif-title" />
          <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {iconSet.map(({ icon: Icon, label }) => <div key={label} className="grid min-h-20 place-items-center rounded-xl border border-[#E8D9C7] bg-[#FFFCF7] p-2 text-center"><Icon className="h-6 w-6 text-[#C9A24C]" /><span className="mt-1 text-[10px] font-bold text-[#665647]">{label}</span></div>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UsageList title="Nên dùng" icon={CheckCircle2} tone="good" items={["Dùng nền kem để tạo độ ấm", "Giữ tương phản chữ dễ đọc", "Chỉ dùng 1–2 motif mỗi khung"]} />
            <UsageList title="Không nên" icon={XCircle} tone="bad" items={["Phủ quá nhiều màu nhấn", "Biến dạng logo hoặc wordmark", "Dùng motif thay nội dung chính"]} />
          </div>
        </section>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[#D8BD82] bg-[#FFF6E8] px-5 py-7 text-center sm:px-8">
        <Sparkles className="mx-auto h-6 w-6 text-[#C9A24C]" />
        <p className="mt-2 font-serif text-2xl font-bold text-[#C24A36]">Lời hứa của SweetTime</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#51483F]">Nguyên liệu chất lượng, sự phục vụ chân thành và những khoảnh khắc đáng sẻ chia. Cảm ơn bạn đã đồng hành và gìn giữ hình ảnh SweetTime.</p>
      </section>
    </div>
  );
}

function ColorCard({ color, onCopy }: { color: (typeof BRAND_COLORS)[number]; onCopy: (hex: string) => void }) {
  return <button type="button" onClick={() => onCopy(color.hex)} className="group overflow-hidden rounded-xl border border-[#E8D9C7] bg-[#FFFCF7] text-left transition hover:-translate-y-0.5 hover:shadow-md" aria-label={`Sao chép màu ${color.name} ${color.hex}`}><span className={`flex h-28 items-end justify-between p-3 ${color.foreground === "light" ? "text-white" : "text-[#1F2E4A]"}`} style={{ backgroundColor: color.hex }}><span className="text-xs font-black uppercase tracking-[0.08em]">{color.hex}</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-black/10 backdrop-blur-sm"><Clipboard className="h-4 w-4" /></span></span><span className="block p-4"><strong className="block text-sm text-[#1F2E4A]">{color.name}</strong><span className="mt-1 block text-xs leading-5 text-[#7E6A59]">{color.role}</span></span></button>;
}

function SectionHeading({ icon: Icon, eyebrow, title, description, id }: { icon: LucideIcon; eyebrow: string; title: string; description: string; id: string }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F2E8DA] text-[#C9A24C]"><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#C24A36]">{eyebrow}</p><h2 id={id} className="mt-1 font-serif text-2xl font-bold tracking-[-0.02em] text-[#1F2E4A]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#7E6A59]">{description}</p></div></div>;
}

function TypeSample({ label, meta, className, text }: { label: string; meta: string; className: string; text: string }) {
  return <div className="rounded-xl border border-[#E8D9C7] bg-[#FFFCF7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#C9A24C]">{label}</p><span className="text-[11px] font-bold text-[#9B8877]">{meta}</span></div><p className={`mt-3 ${className}`}>{text}</p></div>;
}

function UsageList({ title, icon: Icon, tone, items }: { title: string; icon: LucideIcon; tone: "good" | "bad"; items: string[] }) {
  const styles = tone === "good" ? "bg-[#F2E8DA] text-[#8A6828]" : "bg-[#F7DBD1]/70 text-[#C24A36]";
  return <div className={`rounded-xl p-4 ${styles}`}><div className="flex items-center gap-2"><Icon className="h-5 w-5" /><h3 className="font-black text-[#1F2E4A]">{title}</h3></div><ul className="mt-3 space-y-2 text-xs leading-5 text-[#665647]">{items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul></div>;
}

function LeafCorner({ className }: { className?: string }) {
  return <Wheat className={`h-16 w-16 text-[#C9A24C] ${className ?? ""}`} aria-hidden="true" />;
}
