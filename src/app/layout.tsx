import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/layout/Header/Header";
import FloatingBottomNav from "@/components/layout/BottomNav/FloatingBottomNav";

export const metadata: Metadata = {
  title: "SweetTime — Bake Joy, Share Time",
  description: "Bánh thủ công và những khoảnh khắc ngọt ngào mỗi ngày.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="relative flex min-h-screen flex-col bg-bg-main pb-28 font-sans antialiased md:pb-0" suppressHydrationWarning>
        <Header />
        <main className="w-full flex-grow">{children}</main>
        <FloatingBottomNav />
      </body>
    </html>
  );
}
