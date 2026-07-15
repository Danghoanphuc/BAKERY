import { NextResponse } from "next/server";
import { getProductById } from "@/lib/db";

interface ProductMeta {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  price: number;
}

const DEFAULT_META: ProductMeta = {
  title: "Tiệm Bánh Ngọt - Bánh tươi ngon mỗi ngày",
  description: "Chuyên cung cấp các loại bánh ngọt, bánh sinh nhật, bánh mì tươi ngon và chất lượng. Đặt bánh ngay hôm nay!",
  imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&h=630&fit=crop",
  url: "http://localhost:3000",
  price: 0,
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

    const meta: ProductMeta = product
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 0;
      margin: 0;
    }
    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      text-align: center;
      color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .app-header h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .app-header p {
      font-size: 12px;
      opacity: 0.9;
    }
    .product-card {
      background: white;
      margin: 16px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .product-image {
      width: 100%;
      height: 280px;
      object-fit: cover;
      background: #f0f0f0;
    }
    .product-info {
      padding: 20px;
    }
    .product-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .product-description {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-price {
      font-size: 28px;
      font-weight: 700;
      color: #e74c3c;
      margin-bottom: 20px;
    }
    .price-label {
      font-size: 14px;
      color: #999;
      font-weight: 400;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .info-box {
      background: #fff9e6;
      border-left: 4px solid #ffc107;
      padding: 16px;
      margin: 16px;
      border-radius: 8px;
    }
    .info-box h3 {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .info-box p {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
    .app-footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="app-header">
    <h1>🧁 Tiệm Bánh Ngọt</h1>
    <p>Chuyên bánh tươi ngon mỗi ngày</p>
  </div>
  
  <div class="product-card">
    <img src="${meta.imageUrl}" alt="${meta.title}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=280&fit=crop'">
    <div class="product-info">
      <h2 class="product-title">${meta.title}</h2>
      <p class="product-description">${meta.description}</p>
      <div class="product-price">
        <span class="price-label">Giá: </span>
        ${new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(meta.price)}
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary" onclick="openInExternalBrowser()" id="mainBtn">
          <span class="loading hidden" id="loading"></span>
          <span id="btnText">Mở trong trình duyệt</span>
        </button>
        <button class="btn btn-secondary" onclick="copyLink()">Copy Link</button>
      </div>
    </div>
  </div>
  
  <div class="info-box">
    <h3>💡 Mẹo mở link</h3>
    <p>Nhấn giữ vào link → Chọn "Mở trong Chrome/Safari" để trải nghiệm tốt nhất</p>
  </div>
  
  <div class="app-footer">
    <p>© 2024 Tiệm Bánh Ngọt. Tất cả quyền được bảo lưu.</p>
  </div>

  <script>
    const targetUrl = "${meta.url}";
    
    function openInExternalBrowser() {
      const btn = document.getElementById('mainBtn');
      const loading = document.getElementById('loading');
      const btnText = document.getElementById('btnText');
      
      // Show loading state
      loading.classList.remove('hidden');
      btnText.textContent = 'Đang mở...';
      btn.disabled = true;
      
      // Try multiple methods to open in external browser
      const methods = [
        // Method 1: Direct window.location (may open in in-app browser)
        () => { window.location.href = targetUrl; },
        // Method 2: Using intent scheme for Android
        () => { 
          const intentUrl = 'intent://' + targetUrl.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
          window.location.href = intentUrl;
        },
        // Method 3: Try to open in Safari (iOS)
        () => { window.open('x-web-search://?q=' + encodeURIComponent(targetUrl)); }
      ];
      
      let methodIndex = 0;
      function tryNextMethod() {
        if (methodIndex < methods.length) {
          try {
            methods[methodIndex]();
            methodIndex++;
            setTimeout(tryNextMethod, 1000);
          } catch (e) {
            console.error('Method failed:', e);
            methodIndex++;
            setTimeout(tryNextMethod, 100);
          }
        } else {
          // All methods failed, reset button
          loading.classList.add('hidden');
          btnText.textContent = 'Thử lại';
          btn.disabled = false;
          
          // Show manual instructions
          alert('Vui lòng nhấn giữ vào link này và chọn "Mở trong Chrome/Safari"');
        }
      }
      
      tryNextMethod();
    }
    
    function copyLink() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetUrl).then(() => {
          alert('Đã copy link! Vui lòng dán vào trình duyệt.');
        }).catch(() => {
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }
    }
    
    function fallbackCopy() {
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Đã copy link! Vui lòng dán vào trình duyệt.');
      } catch (e) {
        alert('Không thể copy link. Vui lòng copy thủ công: ' + targetUrl);
      }
      document.body.removeChild(textArea);
    }
    
    // Auto-detect if already in external browser
    if (!navigator.userAgent.includes('FBAV') && !navigator.userAgent.includes('FBAN') && !navigator.userAgent.includes('zaloapp')) {
      // If not in in-app browser, redirect automatically
      window.location.href = targetUrl;
    }
  </script>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 0;
      margin: 0;
    }
    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      text-align: center;
      color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .app-header h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .app-header p {
      font-size: 12px;
      opacity: 0.9;
    }
    .product-card {
      background: white;
      margin: 16px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 24px;
      text-align: center;
    }
    .product-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    .product-description {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .info-box {
      background: #fff9e6;
      border-left: 4px solid #ffc107;
      padding: 16px;
      margin: 16px;
      border-radius: 8px;
    }
    .info-box h3 {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .info-box p {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
    .app-footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="app-header">
    <h1>🧁 Tiệm Bánh Ngọt</h1>
    <p>Chuyên bánh tươi ngon mỗi ngày</p>
  </div>
  
  <div class="product-card">
    <h2 class="product-title">${DEFAULT_META.title}</h2>
    <p class="product-description">${DEFAULT_META.description}</p>
    <div class="action-buttons">
      <button class="btn btn-primary" onclick="window.location.href='${DEFAULT_META.url}'">
        Mở trong trình duyệt
      </button>
    </div>
  </div>
  
  <div class="info-box">
    <h3>💡 Mẹo mở link</h3>
    <p>Nhấn giữ vào link → Chọn "Mở trong Chrome/Safari" để trải nghiệm tốt nhất</p>
  </div>
  
  <div class="app-footer">
    <p>© 2024 Tiệm Bánh Ngọt. Tất cả quyền được bảo lưu.</p>
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