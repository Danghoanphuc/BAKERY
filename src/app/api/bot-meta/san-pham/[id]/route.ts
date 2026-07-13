import { NextResponse } from "next/server";
import { getProductById } from "@/lib/db";

const DEFAULT_META = {
  title: "Tiệm Bánh Ngọt - Bánh tươi ngon mỗi ngày",
  description: "Chuyên cung cấp các loại bánh ngọt, bánh sinh nhật, bánh mì tươi ngon và chất lượng. Đặt bánh ngay hôm nay!",
  imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&h=630&fit=crop",
  url: "http://localhost:3000",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await getProductById(id);

    const meta = product
      ? {
          title: product.name,
          description:
            product.description ||
            product.social?.description ||
            `${product.name} - Giá: ${new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(product.price)}`,
          imageUrl: product.social?.imageUrl || product.imageUrl,
          url: `${process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || "http://localhost:3000"}/san-pham/${id}`,
        }
      : DEFAULT_META;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:image" content="${meta.imageUrl}" />
  <meta property="og:url" content="${meta.url}" />
  <meta property="og:type" content="product" />
  <meta property="product:price:amount" content="${product?.price || 0}" />
  <meta property="product:price:currency" content="VND" />
</head>
<body></body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching product meta:", error);

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${DEFAULT_META.title}" />
  <meta property="og:description" content="${DEFAULT_META.description}" />
  <meta property="og:image" content="${DEFAULT_META.imageUrl}" />
  <meta property="og:url" content="${DEFAULT_META.url}" />
  <meta property="og:type" content="website" />
</head>
<body></body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}
