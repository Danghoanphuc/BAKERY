import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/layout/Header/Header";
import FloatingBottomNav from "@/components/layout/BottomNav/FloatingBottomNav";

export const metadata: Metadata = {
  title: "App của bạn",
  description: "Mô tả",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      {/* Cập nhật khoảng đệm đáy pb-28 để chừa chỗ cho thanh Nav lơ lửng */}
      <body className="min-h-screen flex flex-col pb-28 md:pb-0 relative bg-gray-50 font-sans antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detect in-app browser and provide fallback
              (function() {
                const userAgent = navigator.userAgent.toLowerCase();
                const isInAppBrowser = userAgent.includes('fban') || userAgent.includes('fbav') || userAgent.includes('zaloapp');
                
                if (isInAppBrowser) {
                  // Add minimal inline styles for basic rendering
                  const style = document.createElement('style');
                  style.textContent = \`
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    .fallback-container { padding: 20px; text-align: center; }
                    .fallback-button { 
                      display: inline-block; 
                      padding: 12px 24px; 
                      background: #007bff; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      margin-top: 20px;
                    }
                  \`;
                  document.head.appendChild(style);
                  
                  // Show fallback if React fails to load
                  window.addEventListener('error', function(e) {
                    if (e.message && e.message.includes('script')) {
                      document.body.innerHTML = \`
                        <div class="fallback-container">
                          <h2>Đang tải...</h2>
                          <p>Vui lòng đợi trong giây lát hoặc mở trong trình duyệt mặc định.</p>
                          <a href="\${window.location.href}" class="fallback-button">Mở lại</a>
                        </div>
                      \`;
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
        <Header />

        <main className="flex-grow w-full">{children}</main>

        {/* Gọi Component Glassmorphism Nav tại đây */}
        <FloatingBottomNav />
      </body>
    </html>
  );
}
