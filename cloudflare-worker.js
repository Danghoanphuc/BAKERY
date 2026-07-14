/**
 * Cloudflare Worker - Edge Router for Bakery App
 * Origin: Set via environment variable ORIGIN
 */

const ORIGIN = typeof ORIGIN !== 'undefined' ? ORIGIN : "https://bakery-production-9c75.up.railway.app";
const CUSTOMER_APP_URL = typeof NEXT_PUBLIC_CUSTOMER_APP_URL !== 'undefined' ? NEXT_PUBLIC_CUSTOMER_APP_URL : "https://bakery.printz.vn";

// Spam query parameters to remove
const SPAM_PARAMS = ["fbclid", "zarsrc", "gclid"];

// Bot user agent patterns (only for crawlers, not app browsers)
const BOT_PATTERNS = ["facebookexternalhit", "zalo", "googlebot"];

/**
 * Remove spam query parameters and redirect with 301
 */
function handleSpamParams(url) {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  let hasSpam = false;

  SPAM_PARAMS.forEach((param) => {
    if (params.has(param)) {
      params.delete(param);
      hasSpam = true;
    }
  });

  if (hasSpam) {
    const cleanUrl = urlObj.toString();
    return Response.redirect(cleanUrl, 301);
  }

  return null;
}

/**
 * Check if user agent matches bot patterns (crawlers only, not app browsers)
 */
function isBot(userAgent) {
  if (!userAgent) return false;
  const uaLower = userAgent.toLowerCase();
  
  // Only match specific crawler patterns, not app browsers
  const isFacebookCrawler = uaLower.includes("facebookexternalhit");
  const isZaloCrawler = uaLower.includes("zalo") && !uaLower.includes("zaloapp");
  const isGooglebot = uaLower.includes("googlebot");
  
  return isFacebookCrawler || isZaloCrawler || isGooglebot;
}

/**
 * Check if user agent is Facebook/Zalo in-app browser
 */
function isInAppBrowser(userAgent) {
  if (!userAgent) return false;
  const uaLower = userAgent.toLowerCase();
  
  // Facebook in-app browser
  const isFacebookApp = uaLower.includes("fban") || uaLower.includes("fbav");
  // Zalo in-app browser
  const isZaloApp = uaLower.includes("zaloapp");
  
  return isFacebookApp || isZaloApp;
}

/**
 * Redirect to open in default browser
 */
function redirectToDefaultBrowser(url) {
  // For Facebook: use fb:// protocol or redirect to browser
  // For Zalo: use zalo:// protocol or redirect to browser
  return Response.redirect(url, 302);
}

/**
 * Extract product ID from /san-pham/:id URL
 */
function extractProductId(pathname) {
  const match = pathname.match(/^\/san-pham\/([^\/]+)$/);
  return match ? match[1] : null;
}

/**
 * Rewrite request to bot-meta endpoint
 */
function rewriteToBotMeta(request, productId) {
  const botMetaUrl = `${ORIGIN}/api/bot-meta/san-pham/${productId}`;
  
  const newHeaders = new Headers(request.headers);
  newHeaders.set("X-Forwarded-Host", new URL(request.url).hostname);
  newHeaders.set("X-Customer-App-Url", CUSTOMER_APP_URL);
  
  const newRequest = new Request(botMetaUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: "manual",
  });

  return fetch(newRequest);
}

/**
 * Fetch from origin server
 */
function fetchOrigin(request, pathname) {
  const originUrl = `${ORIGIN}${pathname}${request.url.split(pathname)[1] || ""}`;
  
  const newRequest = new Request(originUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });

  return fetch(newRequest);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const userAgent = request.headers.get("User-Agent") || "";

    // Step 1: Check and remove spam query parameters
    const spamRedirect = handleSpamParams(request.url);
    if (spamRedirect) {
      return spamRedirect;
    }

    // Step 2: Route based on User-Agent and URL path
    const isBotRequest = isBot(userAgent);
    const isProductPath = pathname.startsWith("/san-pham/");

    if (isBotRequest && isProductPath) {
      // Bot flow: rewrite to /api/bot-meta/san-pham/:id
      const productId = extractProductId(pathname);
      
      if (productId) {
        return rewriteToBotMeta(request, productId);
      }
    }

    // Step 3: Regular user flow - fetch from origin (including in-app browsers)
    return fetchOrigin(request, pathname);
  },
};
