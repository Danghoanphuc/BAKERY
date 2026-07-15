import { NextResponse } from "next/server";
import { getProductById } from "@/lib/db";

const DEFAULT_META = {
  title: "Tiệm Bánh Ngọt - Bánh tươi ngon mỗi ngày",
  description: "Chuyên cung cấp các loại bánh ngọt, bánh sinh nhật, bánh mì tươi ngon và chất lượng. Đặt bánh ngay hôm nay!",
  imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&h=630&fit=crop",
  url: "http://localhost:3000",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await getProductById(id);

    // Get customer app URL from header (priority) or environment variable
    const customerAppUrl = request.headers.get("X-Customer-App-Url") || 
                           "http://localhost:3000";

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
          url: `${customerAppUrl}/san-pham/${id}`,
          price: product.price,
        }
      : DEFAULT_META;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:image" content="${meta.imageUrl}" />
  <meta property="og:url" content="${meta.url}" />
  <meta property="og:type" content="product" />
  <meta property="product:price:amount" content="${meta.price || 0}" />
  <meta property="product:price:currency" content="VND" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 100%;
      overflow: hidden;
    }
    .product-image {
      width: 100%;
      height: 250px;
      object-fit: cover;
      background: #f0f0f0;
    }
    .content {
      padding: 24px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .description {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .price {
      font-size: 24px;
      font-weight: 700;
      color: #e74c3c;
      margin-bottom: 20px;
    }
    .button {
      display: block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: transform 0.2s;
      border: none;
      cursor: pointer;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .message {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${meta.imageUrl}" alt="${meta.title}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=250&fit=crop'">
    <div class="content">
      <h1 class="title">${meta.title}</h1>
      <p class="description">${meta.description}</p>
      <div class="price">${new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(meta.price || 0)}</div>
      <a href="${meta.url}" class="button">Mở trong trình duyệt</a>
      <p class="message">Để trải nghiệm tốt nhất, vui lòng mở trong trình duyệt mặc định</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching product for in-app browser:", error);

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${DEFAULT_META.title}" />
  <meta property="og:description" content="${DEFAULT_META.description}" />
  <meta property="og:image" content="${DEFAULT_META.imageUrl}" />
  <meta property="og:url" content="${DEFAULT_META.url}" />
  <meta property="og:type" content="website" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 100%;
      padding: 32px;
      text-align: center;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    .description {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: transform 0.2s;
      border: none;
      cursor: pointer;
    }
    .button:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">${DEFAULT_META.title}</h1>
    <p class="description">${DEFAULT_META.description}</p>
    <a href="${DEFAULT_META.url}" class="button">Mở trong trình duyệt</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}