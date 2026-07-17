export const BRAND_COLORS = [
  { name: "Đỏ đất nung", hex: "#C24A36", role: "Màu thương hiệu chính, tiêu đề và nút hành động", foreground: "light" },
  { name: "Xanh navy đậm", hex: "#1F2E4A", role: "Nội dung, nền tối và cảm giác tin cậy", foreground: "light" },
  { name: "Kem ấm", hex: "#FFF6E8", role: "Nền chính, khoảng thở và cảm giác dịu dàng", foreground: "dark" },
  { name: "Vàng trầm", hex: "#C9A24C", role: "Điểm nhấn, biểu tượng và chi tiết cao cấp", foreground: "dark" },
] as const;

export const BRAND_SUPPORT_COLORS = [
  { name: "Hồng phấn", hex: "#F7DBD1", role: "Khoảnh khắc ấm áp, lãng mạn" },
  { name: "Caramel nướng", hex: "#D2986A", role: "Bánh nướng, nút phụ và nhãn" },
  { name: "Taupe ấm", hex: "#B8A48F", role: "Bề mặt trung tính và bao bì" },
  { name: "Beige nhạt", hex: "#F2E8DA", role: "Nền phụ và bề mặt giấy" },
  { name: "Vàng mật ong", hex: "#F4B438", role: "Ưu đãi, huy hiệu và điểm sáng" },
] as const;

export const BRAND_TRAITS = ["Ấm áp", "Thân thiện", "Thủ công"] as const;

export const BRAND_ASSETS = [
  { label: "Logo chính", href: "/brand/sweetime-wordmark.svg", fileName: "sweetime-wordmark.svg" },
  { label: "Logo trên nền tối", href: "/brand/sweetime-wordmark-reverse.svg", fileName: "sweetime-wordmark-reverse.svg" },
  { label: "Biểu tượng thương hiệu", href: "/brand/sweetime-mark.svg", fileName: "sweetime-mark.svg" },
  { label: "Ảnh chia sẻ mạng xã hội", href: "/brand/sweetime-social-card.svg", fileName: "sweetime-social-card.svg" },
] as const;

export const BRAND_META = {
  name: "SweetTime",
  descriptor: "Bakery & Tea",
  tagline: "Bake Joy, Share Time",
  promise: "Nướng niềm vui, sẻ chia khoảnh khắc",
  version: "2.0",
} as const;
