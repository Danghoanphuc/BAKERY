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
              // Detect in-app browser and disable hydration warnings
              (function() {
                const userAgent = navigator.userAgent.toLowerCase();
                const isInAppBrowser = userAgent.includes('fban') || userAgent.includes('fbav') || userAgent.includes('zaloapp');
                
                if (isInAppBrowser) {
                  // Suppress React hydration errors
                  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
                  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.suppressRenderErrorMessage = true;
                  
                  // Disable console errors for hydration
                  const originalError = console.error;
                  console.error = function(...args) {
                    if (typeof args[0] === 'string' && args[0].includes('hydration')) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
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
