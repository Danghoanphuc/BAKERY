import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/layout/Header/Header";
import FloatingBottomNav from "@/components/layout/BottomNav/FloatingBottomNav";
import InAppBrowserHandler from "@/components/InAppBrowserHandler";

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
    <html lang="vi">
      {/* Cập nhật khoảng đệm đáy pb-28 để chừa chỗ cho thanh Nav lơ lửng */}
      <body className="min-h-screen flex flex-col pb-28 md:pb-0 relative bg-gray-50 font-sans antialiased">
        <InAppBrowserHandler />
        <Header />

        <main className="flex-grow w-full">{children}</main>

        {/* Gọi Component Glassmorphism Nav tại đây */}
        <FloatingBottomNav />
      </body>
    </html>
  );
}
