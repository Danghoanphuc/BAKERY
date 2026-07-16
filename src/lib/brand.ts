export const BRAND_COLORS = [
  { name: "Brick Red", hex: "#D94A34", role: "Năng lượng, điểm nhấn", foreground: "light" },
  { name: "Deep Navy", hex: "#123E66", role: "Tin cậy, tiêu đề", foreground: "light" },
  { name: "Cream", hex: "#F4EBDD", role: "Nền ấm, sạch", foreground: "dark" },
  { name: "Teal", hex: "#2F8D88", role: "Tươi mới, cân bằng", foreground: "light" },
  { name: "Coral", hex: "#F07A58", role: "Thân thiện, gần gũi", foreground: "light" },
  { name: "Soft Sand", hex: "#E6D7C5", role: "Nền hỗ trợ", foreground: "dark" },
  { name: "Warm Beige", hex: "#DCC8B4", role: "Bao bì, chất liệu", foreground: "dark" },
  { name: "Charcoal", hex: "#2D2A28", role: "Nội dung, tương phản", foreground: "light" },
] as const;

export const BRAND_TRAITS = ["Warm", "Joyful", "Refined"] as const;

export const BRAND_ASSETS = [
  { label: "Logo chính", href: "/brand/sweetime-wordmark.svg", fileName: "sweetime-wordmark.svg" },
  { label: "Logo nền tối", href: "/brand/sweetime-wordmark-reverse.svg", fileName: "sweetime-wordmark-reverse.svg" },
  { label: "Biểu tượng", href: "/brand/sweetime-mark.svg", fileName: "sweetime-mark.svg" },
  { label: "Ảnh chia sẻ", href: "/brand/sweetime-social-card.svg", fileName: "sweetime-social-card.svg" },
] as const;

export const BRAND_META = {
  name: "SweetTime",
  tagline: "Bake Joy, Share Time",
  version: "1.0",
} as const;
