import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Bánh Sinh Nhật", iconUrl: "🎂", displayOrder: 1 },
  { name: "Bánh Mì Ngọt", iconUrl: "🥐", displayOrder: 2 },
  { name: "Bánh Kem Lạnh", iconUrl: "🍰", displayOrder: 3 },
  { name: "Bánh Quy", iconUrl: "🍪", displayOrder: 4 },
  { name: "Bánh Tart & Pie", iconUrl: "🥧", displayOrder: 5 },
  { name: "Đồ Uống", iconUrl: "☕", displayOrder: 6 },
  { name: "Phụ Kiện Tiệc", iconUrl: "🎈", displayOrder: 7 },
  { name: "Combo Ưu Đãi", iconUrl: "🎁", displayOrder: 8 },
];

async function main() {
  console.log("🚀 Bắt đầu seed database...\n");

  // Seed categories
  console.log("🔥 Seed categories...");
  const createdCategories = await Promise.all(
    categories.map((cat) =>
      prisma.category.create({
        data: cat,
      }),
    ),
  );
  console.log(`✅ Đã tạo ${createdCategories.length} danh mục\n`);

  // Seed products
  console.log("🔥 Seed products...");
  const products = [
    {
      name: "Bánh Red Velvet Cao Cấp",
      price: 350000,
      imageUrl:
        "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400",
      categoryId: createdCategories[0].id,
      description:
        "Bánh Red Velvet với lớp kem cheese Philly mịn màng, trang trí hoa hồng buttercream tinh tế",
      isFeatured: true,
      isBestseller: true,
      stock: 15,
      sizeOptions: JSON.stringify([
        { id: "16cm", label: "16cm (4-6 người)", priceAdjustment: 0 },
        { id: "20cm", label: "20cm (8-10 người)", priceAdjustment: 100000 },
      ]),
      flavorOptions: JSON.stringify([
        { id: "original", label: "Kem Cheese Truyền Thống" },
        { id: "dark-choco", label: "Kem Dark Chocolate" },
      ]),
      requiresMessage: true,
    },
    {
      name: "Croissant Bơ Pháp",
      price: 35000,
      imageUrl:
        "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
      categoryId: createdCategories[1].id,
      description: "Croissant bơ lạt Pháp, 27 lớp giòn rụm, thơm nức mùi bơ",
      isBestseller: true,
      stock: 50,
    },
    {
      name: "Tiramisu Ý Truyền Thống",
      price: 450000,
      imageUrl:
        "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
      categoryId: createdCategories[2].id,
      description:
        "Tiramisu Ý chính gốc với bánh Savoiardi, mascarpone nhập khẩu",
      isFeatured: true,
      isBestseller: true,
      stock: 12,
    },
    {
      name: "Cookie Socola Chip Mỹ",
      price: 45000,
      imageUrl:
        "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
      categoryId: createdCategories[3].id,
      description:
        "Cookie Mỹ truyền thống với chip socola đen Bỉ, ngoài giòn trong mềm",
      isBestseller: true,
      stock: 80,
    },
    {
      name: "Egg Tart Bồ Đào Nha",
      price: 30000,
      imageUrl:
        "https://images.unsplash.com/photo-1587241321921-91a834d82ffc?w=400",
      categoryId: createdCategories[4].id,
      description: "Bánh tart trứng kiểu Bồ Đào Nha, vỏ giòn xốp",
      isBestseller: true,
      stock: 40,
    },
    {
      name: "Matcha Latte Nóng/Đá",
      price: 55000,
      imageUrl:
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
      categoryId: createdCategories[5].id,
      description: "Trà xanh matcha Nhật nguyên chất, pha cùng sữa tươi",
      isBestseller: true,
      stock: 100,
    },
    {
      name: "Nến Sinh Nhật Cao Cấp (Set 10)",
      price: 25000,
      imageUrl:
        "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400",
      categoryId: createdCategories[6].id,
      description: "Bộ 10 nến sinh nhật không khói, không mùi, cháy đều",
      stock: 200,
    },
    {
      name: "Combo Tiệc Nhỏ (4-6 người)",
      price: 550000,
      imageUrl:
        "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400",
      categoryId: createdCategories[7].id,
      description:
        "Gồm: 1 bánh sinh nhật 16cm, 6 croissant, 6 cookie. Tiết kiệm 15%",
      isFeatured: true,
      isBestseller: true,
      stock: 8,
    },
  ];

  const createdProducts = await Promise.all(
    products.map((product) =>
      prisma.product.create({
        data: product,
      }),
    ),
  );
  console.log(`✅ Đã tạo ${createdProducts.length} sản phẩm\n`);

  console.log("🎉 Seed hoàn tất!");
  console.log(`📊 Tổng kết:`);
  console.log(`   - ${createdCategories.length} danh mục`);
  console.log(`   - ${createdProducts.length} sản phẩm`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
