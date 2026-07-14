"use client";

import { useEffect } from "react";

export default function InAppBrowserHandler() {
  useEffect(() => {
    // Detect in-app browser and redirect to default browser
    const userAgent = navigator.userAgent.toLowerCase();
    const isFacebookApp = userAgent.includes("fban") || userAgent.includes("fbav");
    const isZaloApp = userAgent.includes("zaloapp");

    if (isFacebookApp || isZaloApp) {
      const currentUrl = window.location.href;
      
      // For Facebook: use fb:// protocol to open in external browser
      if (isFacebookApp) {
        // Try to open in external browser using intent scheme
        const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
        
        // Fallback to window.location if intent fails
        try {
          window.location.href = intentUrl;
        } catch (e) {
          // If intent fails, show a message to user
          document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; font-family: sans-serif;">
              <h2 style="margin-bottom: 20px;">Mở link trong trình duyệt</h2>
              <p style="margin-bottom: 20px;">Để trải nghiệm tốt nhất, vui lòng mở link này trong trình duyệt mặc định của bạn.</p>
              <a href="${currentUrl}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 8px;">Mở trong trình duyệt</a>
            </div>
          `;
        }
      }
      
      // For Zalo: use zalo:// protocol to open in external browser
      if (isZaloApp) {
        // Show message to open in external browser
        document.body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; font-family: sans-serif;">
            <h2 style="margin-bottom: 20px;">Mở link trong trình duyệt</h2>
            <p style="margin-bottom: 20px;">Để trải nghiệm tốt nhất, vui lòng mở link này trong trình duyệt mặc định của bạn.</p>
            <a href="${currentUrl}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 8px;">Mở trong trình duyệt</a>
          </div>
        `;
      }
    }
  }, []);

  return null;
}
