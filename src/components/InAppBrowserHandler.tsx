"use client";

import { useEffect } from "react";

export default function InAppBrowserHandler() {
  useEffect(() => {
    // Client-side fallback for in-app browser detection
    // This is backup for server-side detection in Cloudflare Worker
    const userAgent = navigator.userAgent.toLowerCase();
    const isFacebookApp = userAgent.includes("fban") || userAgent.includes("fbav");
    const isZaloApp = userAgent.includes("zaloapp");

    if (isFacebookApp || isZaloApp) {
      const currentUrl = window.location.href;
      
      // Only show message if we're on a product page and server-side detection failed
      if (window.location.pathname.startsWith("/san-pham/")) {
        // Minimal fallback UI
        const existingFallback = document.getElementById("in-app-fallback");
        if (!existingFallback) {
          const fallbackDiv = document.createElement("div");
          fallbackDiv.id = "in-app-fallback";
          fallbackDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          `;
          
          fallbackDiv.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
              <h2 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px;">Mở trong trình duyệt</h2>
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px;">Để trải nghiệm tốt nhất, vui lòng mở link này trong trình duyệt mặc định của bạn.</p>
              <a href="${currentUrl}" style="display: block; width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">Mở trong trình duyệt</a>
            </div>
          `;
          
          document.body.appendChild(fallbackDiv);
        }
      }
    }
  }, []);

  return null;
}
