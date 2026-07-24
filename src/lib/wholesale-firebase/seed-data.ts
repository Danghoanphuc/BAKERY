/**
 * Dữ liệu mẫu để seed vào Firebase
 * Chạy script này để import dữ liệu vào Firestore
 */

import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";

// =============================================================================
// DANH MỤC BÁNH
// =============================================================================
export const categories: (Category & { id: string })[] = [
  {
    id: "banh-sinh-nhat",
    name: "Bánh Sinh Nhật",
    iconUrl: "🎂",
    displayOrder: 1,
  },
  {
    id: "banh-mi-ngot",
    name: "Bánh Mì Ngọt",
    iconUrl: "🥐",
    displayOrder: 2,
  },
  {
    id: "banh-kem-lanh",
    name: "Bánh Kem Lạnh",
    iconUrl: "🍰",
    displayOrder: 3,
  },
  {
    id: "banh-quy",
    name: "Bánh Quy",
    iconUrl: "🍪",
    displayOrder: 4,
  },
  {
    id: "banh-tart-pie",
    name: "Bánh Tart & Pie",
    iconUrl: "🥧",
    displayOrder: 5,
  },
  {
    id: "do-uong",
    name: "Đồ Uống",
    iconUrl: "☕",
    displayOrder: 6,
  },
  {
    id: "phu-kien",
    name: "Phụ Kiện Tiệc",
    iconUrl: "🎈",
    displayOrder: 7,
  },
  {
    id: "combo-uu-dai",
    name: "Combo Ưu Đãi",
    iconUrl: "🎁",
    displayOrder: 8,
  },
];

// =============================================================================
// SẢN PHẨM BÁNH
// =============================================================================
export const products: (Product & {
  id: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  createdAt?: Date;
})[] = [
  // ------------- BÁNH SINH NHẬT -------------
  {
    id: "banh-red-velvet",
    name: "Bánh Red Velvet Cao Cấp",
    price: 350000,
    imageUrl:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400",
    categoryId: "banh-sinh-nhat",
    description:
      "Bánh Red Velvet với lớp kem cheese Philly mịn màng, trang trí hoa hồng buttercream tinh tế. Màu đỏ quyến rũ từ màu tự nhiên củ dền.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
      { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 100000 },
      { id: "24cm", label: "24cm (12-15 người)", priceAdjustment: 200000 },
    ],
    flavorOptions: [
      { id: "original", label: "Kem Cheese Truyền Thống" },
      { id: "dark-choco", label: "Kem Dark Chocolate" },
      { id: "cream-cheese", label: "Kem Cream Cheese Đặc Biệt" },
    ],
    requiresMessage: true,
    isFeatured: true,
    isBestseller: true,
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "banh-black-forest",
    name: "Bánh Black Forest Rừng Đen",
    price: 320000,
    imageUrl:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
    categoryId: "banh-sinh-nhat",
    description:
      "Bánh socola đen đậm đà, kết hợp với kem tươi và cherry tươi. Phủ vảy socola Bỉ nhập khẩu, trang trí cherry Maraschino.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
      { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 90000 },
      { id: "24cm", label: "24cm (12-15 người)", priceAdjustment: 180000 },
    ],
    flavorOptions: [
      { id: "classic", label: "Socola Đen Cổ Điển" },
      { id: "white-choco", label: "Socola Trắng Cherry" },
    ],
    requiresMessage: true,
    isBestseller: true,
    createdAt: new Date("2026-05-15"),
  },
  {
    id: "banh-mousse-dau",
    name: "Bánh Mousse Dâu Tây Tươi",
    price: 380000,
    imageUrl:
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400",
    categoryId: "banh-sinh-nhat",
    description:
      "Mousse dâu tây mịn màng, lớp gương mirror glaze bóng loáng, điểm xuyết dâu tây tươi Đà Lạt. Vị ngọt thanh mát, quyến rũ.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
      { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 120000 },
    ],
    requiresMessage: true,
    isFeatured: true,
    isNew: true,
    createdAt: new Date("2026-06-25"),
  },
  {
    id: "banh-trung-thu-sang-trong",
    name: "Bánh Trà Xanh Matcha Nhật",
    price: 420000,
    imageUrl:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
    categoryId: "banh-sinh-nhat",
    description:
      "Bánh matcha Nhật Bản nguyên chất, lớp kem matcha mịn, trang trí hoa sen đậu đỏ nghệ thuật. Vị đắng nhẹ hòa quyện ngọt thanh.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
      { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 130000 },
    ],
    flavorOptions: [
      { id: "matcha-pure", label: "Matcha Nguyên Chất" },
      { id: "matcha-redbean", label: "Matcha Đậu Đỏ" },
    ],
    requiresMessage: true,
    isFeatured: true,
    createdAt: new Date("2026-06-10"),
  },

  // ------------- BÁNH MÌ NGỌT -------------
  {
    id: "croissant-bo-phap",
    name: "Croissant Bơ Pháp",
    price: 35000,
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
    categoryId: "banh-mi-ngot",
    description:
      "Croissant bơ lạt Pháp, 27 lớp giòn rụm, thơm nức mùi bơ. Nướng tươi mỗi sáng, ăn kèm mứt dâu hoặc chocolate.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: "banh-mi-bo-toi",
    name: "Bánh Mì Bơ Tỏi Hàn Quốc",
    price: 28000,
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    categoryId: "banh-mi-ngot",
    description:
      "Bánh mì mềm phủ bơ tỏi thơm lừng, rắc phô mai Parmesan và rau mùi tây. Kiểu Hàn Quốc hiện đại.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-20"),
  },
  {
    id: "banh-mi-socola",
    name: "Pain Au Chocolat",
    price: 40000,
    imageUrl:
      "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
    categoryId: "banh-mi-ngot",
    description:
      "Bánh mì ngọt Pháp với thanh socola đen nguyên chất bên trong, lớp vỏ giòn tan, bên trong mềm ấm.",
    availableForDelivery: true,
    availableForPickup: true,
    isFeatured: true,
    createdAt: new Date("2026-06-05"),
  },
  {
    id: "banh-bao-nhan-kem",
    name: "Bánh Bao Nhân Kem Custard",
    price: 32000,
    imageUrl:
      "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400",
    categoryId: "banh-mi-ngot",
    description:
      "Bánh bao Nhật Bản mềm mịn, nhân kem custard béo ngậy, thơm vanilla Tahiti. Ăn nóng càng ngon.",
    availableForDelivery: true,
    availableForPickup: true,
    isNew: true,
    createdAt: new Date("2026-06-28"),
  },

  // ------------- BÁNH KEM LẠNH -------------
  {
    id: "tiramisu-y",
    name: "Tiramisu Ý Truyền Thống",
    price: 450000,
    imageUrl:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
    categoryId: "banh-kem-lanh",
    description:
      "Tiramisu Ý chính gốc với bánh Savoiardi, mascarpone nhập khẩu, cà phê Espresso đắng nhẹ, rắc bột cacao nguyên chất.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "small", label: "Nhỏ (2-4 người)", priceAdjustment: 0 },
      { id: "medium", label: "Vừa (6-8 người)", priceAdjustment: 150000 },
      { id: "large", label: "Lớn (10-12 người)", priceAdjustment: 300000 },
    ],
    flavorOptions: [
      { id: "classic", label: "Cổ Điển Cà Phê" },
      { id: "mocha", label: "Mocha Socola" },
      { id: "matcha", label: "Matcha Tiramisu" },
    ],
    isFeatured: true,
    isBestseller: true,
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "cheesecake-new-york",
    name: "Cheesecake New York",
    price: 380000,
    imageUrl:
      "https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=400",
    categoryId: "banh-kem-lanh",
    description:
      "Cheesecake kiểu New York với kem cheese Philadelphia, đế bánh graham giòn, lớp sour cream mỏng. Vị béo mượt đặc trưng.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "small", label: "Nhỏ (4 người)", priceAdjustment: 0 },
      { id: "medium", label: "Vừa (6-8 người)", priceAdjustment: 120000 },
    ],
    flavorOptions: [
      { id: "original", label: "Nguyên Bản" },
      { id: "blueberry", label: "Việt Quất" },
      { id: "strawberry", label: "Dâu Tây" },
      { id: "mango", label: "Xoài Cát" },
    ],
    isFeatured: true,
    createdAt: new Date("2026-05-25"),
  },
  {
    id: "opera-phap",
    name: "Bánh Opera Pháp",
    price: 420000,
    imageUrl:
      "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400",
    categoryId: "banh-kem-lanh",
    description:
      "Bánh Opera Pháp 7 lớp tinh tế: joconde, ganache socola, buttercream cà phê, phủ glaze bóng. Nghệ thuật ẩm thực Pháp.",
    availableForDelivery: true,
    availableForPickup: true,
    isFeatured: true,
    createdAt: new Date("2026-06-15"),
  },

  // ------------- BÁNH QUY -------------
  {
    id: "cookie-socola-chip",
    name: "Cookie Socola Chip Mỹ",
    price: 45000,
    imageUrl:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
    categoryId: "banh-quy",
    description:
      "Cookie Mỹ truyền thống với chip socola đen Bỉ, ngoài giòn trong mềm. Đóng hộp 6 chiếc. Ăn kèm sữa tuyệt vời.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-05"),
  },
  {
    id: "macaron-phap",
    name: "Macaron Pháp Mix Vị",
    price: 120000,
    imageUrl:
      "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=400",
    categoryId: "banh-quy",
    description:
      "Hộp 6 macaron Pháp nhiều vị: dâu, chocolate, vani, chanh leo, trà xanh, dừa. Giòn tan, ngọt thanh, đẹp mắt.",
    availableForDelivery: true,
    availableForPickup: true,
    isFeatured: true,
    isNew: true,
    createdAt: new Date("2026-06-20"),
  },
  {
    id: "banh-quy-hanh",
    name: "Bánh Quy Hành Đài Loan",
    price: 55000,
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400",
    categoryId: "banh-quy",
    description:
      "Bánh quy hành Đài Loan giòn rụm, vị mặn ngọt hài hòa, hành tím thơm nức. Hộp 200g, ăn là nghiện.",
    availableForDelivery: true,
    availableForPickup: true,
    createdAt: new Date("2026-06-01"),
  },

  // ------------- BÁNH TART & PIE -------------
  {
    id: "egg-tart-bo-dao-nha",
    name: "Egg Tart Bồ Đào Nha",
    price: 30000,
    imageUrl:
      "https://images.unsplash.com/photo-1587241321921-91a834d82ffc?w=400",
    categoryId: "banh-tart-pie",
    description:
      "Bánh tart trứng kiểu Bồ Đào Nha, vỏ giòn xốp, nhân trứng custard béo mịn, nướng cháy mặt thơm nức.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "apple-pie-my",
    name: "Apple Pie Mỹ Truyền Thống",
    price: 280000,
    imageUrl:
      "https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400",
    categoryId: "banh-tart-pie",
    description:
      "Bánh táo Mỹ với nhân táo xanh xào quế, vỏ bánh bơ giòn rụm. Ăn nóng kèm kem vanilla là tuyệt.",
    availableForDelivery: true,
    availableForPickup: true,
    sizeOptions: [
      { id: "small", label: "Nhỏ (4-6 người)", priceAdjustment: 0 },
      { id: "large", label: "Lớn (8-10 người)", priceAdjustment: 120000 },
    ],
    isFeatured: true,
    createdAt: new Date("2026-06-05"),
  },
  {
    id: "lemon-tart",
    name: "Lemon Tart Chanh Vàng",
    price: 320000,
    imageUrl:
      "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400",
    categoryId: "banh-tart-pie",
    description:
      "Bánh tart chanh vàng Pháp, nhân lemon curd chua ngọt cân bằng, phủ meringue Ý mềm mịn. Thanh mát giải ngán.",
    availableForDelivery: true,
    availableForPickup: true,
    isNew: true,
    createdAt: new Date("2026-06-27"),
  },

  // ------------- ĐỒ UỐNG -------------
  {
    id: "matcha-latte",
    name: "Matcha Latte Nóng/Đá",
    price: 55000,
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
    categoryId: "do-uong",
    description:
      "Trà xanh matcha Nhật nguyên chất, pha cùng sữa tươi nóng hoặc đá. Đậm đà, thanh mát, tốt cho sức khỏe.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-15"),
  },
  {
    id: "americano",
    name: "Americano Đen/Sữa",
    price: 45000,
    imageUrl:
      "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400",
    categoryId: "do-uong",
    description:
      "Cà phê Americano pha từ hạt Arabica rang vừa, đắng nhẹ, thơm nức. Có thể thêm sữa tươi hoặc sữa yến mạch.",
    availableForDelivery: true,
    availableForPickup: true,
    isBestseller: true,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: "tra-dao-cam-sa",
    name: "Trà Đào Cam Sả",
    price: 50000,
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
    categoryId: "do-uong",
    description:
      "Trà đen kết hợp đào ngâm, cam tươi, sả tươi. Vị chua ngọt hài hòa, thơm mát, giải nhiệt mùa hè.",
    availableForDelivery: true,
    availableForPickup: true,
    isNew: true,
    createdAt: new Date("2026-06-22"),
  },

  // ------------- PHỤ KIỆN TIỆC -------------
  {
    id: "nen-sinh-nhat",
    name: "Nến Sinh Nhật Cao Cấp (Set 10)",
    price: 25000,
    imageUrl:
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400",
    categoryId: "phu-kien",
    description:
      "Bộ 10 nến sinh nhật không khói, không mùi, cháy đều. Có nhiều màu sắc pastel dịu dàng.",
    availableForDelivery: true,
    availableForPickup: true,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: "chu-happy-birthday",
    name: "Chữ HAPPY BIRTHDAY Decor",
    price: 35000,
    imageUrl:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400",
    categoryId: "phu-kien",
    description:
      "Bộ chữ HAPPY BIRTHDAY kim tuyến vàng/bạc, kèm dây treo. Trang trí tiệc sinh nhật lung linh.",
    availableForDelivery: true,
    availableForPickup: true,
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "bong-bay-pastel",
    name: "Bóng Bay Pastel Mix (Set 20)",
    price: 80000,
    imageUrl:
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400",
    categoryId: "phu-kien",
    description:
      "Bộ 20 bóng bay cao su màu pastel nhẹ nhàng: hồng, xanh, tím, vàng. Kèm dây ruy băng. Trang trí tiệc sang trọng.",
    availableForDelivery: true,
    availableForPickup: true,
    createdAt: new Date("2026-06-01"),
  },

  // ------------- COMBO ƯU ĐÃI -------------
  {
    id: "combo-tiec-nho",
    name: "Combo Tiệc Nhỏ (4-6 người)",
    price: 550000,
    imageUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400",
    categoryId: "combo-uu-dai",
    description:
      "Gồm: 1 bánh sinh nhật 16cm, 6 croissant, 6 cookie, 1 set nến + chữ decor. Tiết kiệm 15% so với mua lẻ.",
    availableForDelivery: true,
    availableForPickup: true,
    isFeatured: true,
    isBestseller: true,
    createdAt: new Date("2026-06-10"),
  },
  {
    id: "combo-tiec-lon",
    name: "Combo Tiệc Lớn (10-12 người)",
    price: 980000,
    imageUrl:
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400",
    categoryId: "combo-uu-dai",
    description:
      "Gồm: 1 bánh sinh nhật 20cm, 12 croissant, 12 cookie, 1 hộp macaron, 1 set nến + chữ + bóng bay. Tiết kiệm 20%.",
    availableForDelivery: true,
    availableForPickup: true,
    isFeatured: true,
    createdAt: new Date("2026-06-15"),
  },
  {
    id: "combo-sang-kinh-doanh",
    name: "Combo Sáng Văn Phòng",
    price: 350000,
    imageUrl:
      "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400",
    categoryId: "combo-uu-dai",
    description:
      "Gồm: 10 croissant, 10 bánh mì bơ tỏi, 5 ly cà phê Americano. Phù hợp họp sáng, team building. Giảm 10%.",
    availableForDelivery: true,
    availableForPickup: true,
    isNew: true,
    createdAt: new Date("2026-06-25"),
  },
];

// =============================================================================
// ĐƠN HÀNG MẪU
// =============================================================================
export const orders: Order[] = [
  {
    id: "ord-2026-001",
    orderNumber: "DH-2026-001",
    customerName: "Nguyễn Văn An",
    customerPhone: "0901234567",
    customerEmail: "nguyenvanan@email.com",
    items: [
      {
        cartItemId: "banh-red-velvet|16cm|original|Chúc mừng sinh nhật|5",
        productId: "banh-red-velvet",
        productName: "Bánh Red Velvet Cao Cấp",
        quantity: 1,
        price: 350000,
        imageUrl:
          "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400",
        selectedSize: "16cm (4-6 người)",
        selectedFlavor: "Kem Cheese Truyền Thống",
        customMessage: "Chúc mừng sinh nhật",
        candles: 5,
      },
      {
        cartItemId: "croissant-bo-phap|default|default||0",
        productId: "croissant-bo-phap",
        productName: "Croissant Bơ Pháp",
        quantity: 4,
        price: 35000,
        imageUrl:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
      },
    ],
    totalAmount: 490000,
    orderType: "delivery",
    status: "pending",
    deliveryAddress: "123 Lê Lợi, Quận 1, TP.HCM",
    notes: "Giao trước 10h sáng",
    createdAt: new Date("2026-06-30T08:30:00"),
    updatedAt: new Date("2026-06-30T08:30:00"),
  },
  {
    id: "ord-2026-002",
    orderNumber: "DH-2026-002",
    customerName: "Trần Thị Bình",
    customerPhone: "0912345678",
    items: [
      {
        cartItemId: "tiramisu-y|medium|classic|Happy Anniversary|0",
        productId: "tiramisu-y",
        productName: "Tiramisu Ý Truyền Thống",
        quantity: 1,
        price: 600000,
        imageUrl:
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
        selectedSize: "Vừa (6-8 người)",
        selectedFlavor: "Cổ Điển Cà Phê",
        customMessage: "Happy Anniversary",
      },
    ],
    totalAmount: 600000,
    orderType: "pickup",
    status: "processing",
    pickupTime: "2026-07-01T15:00:00",
    createdAt: new Date("2026-07-01T07:15:00"),
    updatedAt: new Date("2026-07-01T09:00:00"),
  },
  {
    id: "ord-2026-003",
    orderNumber: "DH-2026-003",
    customerName: "Lê Minh Châu",
    customerPhone: "0923456789",
    customerEmail: "leminhchau@email.com",
    items: [
      {
        cartItemId: "combo-tiec-nho|default|default||0",
        productId: "combo-tiec-nho",
        productName: "Combo Tiệc Nhỏ (4-6 người)",
        quantity: 1,
        price: 550000,
        imageUrl:
          "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400",
      },
    ],
    totalAmount: 550000,
    orderType: "delivery",
    status: "completed",
    deliveryAddress: "456 Nguyễn Huệ, Quận 1, TP.HCM",
    createdAt: new Date("2026-06-29T14:20:00"),
    updatedAt: new Date("2026-06-29T16:30:00"),
  },
  {
    id: "ord-2026-004",
    orderNumber: "DH-2026-004",
    customerName: "Phạm Quốc Dũng",
    customerPhone: "0934567890",
    items: [
      {
        cartItemId: "banh-mousse-dau|20cm|default|Congratulations!|0",
        productId: "banh-mousse-dau",
        productName: "Bánh Mousse Dâu Tây Tươi",
        quantity: 1,
        price: 500000,
        imageUrl:
          "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400",
        selectedSize: "20cm (8-10 người)",
        customMessage: "Congratulations!",
      },
      {
        cartItemId: "nen-sinh-nhat|default|default||1",
        productId: "nen-sinh-nhat",
        productName: "Nến Sinh Nhật Cao Cấp (Set 10)",
        quantity: 1,
        price: 25000,
        imageUrl:
          "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400",
        candles: 1,
      },
    ],
    totalAmount: 525000,
    orderType: "preorder",
    status: "pending",
    pickupTime: "2026-07-02T10:00:00",
    notes: "Đặt trước cho sự kiện công ty",
    createdAt: new Date("2026-07-01T10:45:00"),
    updatedAt: new Date("2026-07-01T10:45:00"),
  },
];
