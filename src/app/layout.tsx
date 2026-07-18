import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/layout/Header/Header";
import FloatingBottomNav from "@/components/layout/BottomNav/FloatingBottomNav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "SweetTime — Bake Joy, Share Time",
  description: "Bánh thủ công và những khoảnh khắc ngọt ngào mỗi ngày.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/brand/sweetime-mark.svg" },
  openGraph: {
    title: "SweetTime — Bake Joy, Share Time",
    description: "Bánh thủ công và những khoảnh khắc ngọt ngào mỗi ngày.",
    images: [{ url: "/brand/sweetime-social-card.svg", width: 1200, height: 630, alt: "SweetTime Bakery" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
