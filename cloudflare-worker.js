const DEFAULT_ORIGIN = "https://bakery-production-9c75.up.railway.app";
const DEFAULT_CUSTOMER_APP_URL = "https://bakery.printz.vn";
const TRACKING_PARAMS = new Set(["fbclid", "zarsrc", "gclid"]);

function removeTrackingParams(url) {
  const cleanedUrl = new URL(url);
  for (const param of TRACKING_PARAMS) cleanedUrl.searchParams.delete(param);
  return cleanedUrl;
}

function getProductId(pathname) {
  const match = pathname.match(/^\/san-pham\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isFacebookCrawler(userAgent) {
  const normalizedUserAgent = userAgent.toLowerCase();
  return normalizedUserAgent.includes("facebookexternalhit") || normalizedUserAgent.includes("facebot");
}

function isFacebookInAppBrowser(userAgent) {
  const normalizedUserAgent = userAgent.toLowerCase();
  return normalizedUserAgent.includes("fban") || normalizedUserAgent.includes("fbav") || normalizedUserAgent.includes("fb_iab");
}

function getRuntimeConfig(env) {
  return {
    origin: env?.ORIGIN || DEFAULT_ORIGIN,
    customerAppUrl: env?.NEXT_PUBLIC_CUSTOMER_APP_URL || DEFAULT_CUSTOMER_APP_URL,
  };
}

function createOriginRequest(request, origin, pathname, headers) {
  const incomingUrl = new URL(request.url);
  for (const param of TRACKING_PARAMS) incomingUrl.searchParams.delete(param);
  const originUrl = new URL(origin);
  originUrl.pathname = pathname;
  originUrl.search = incomingUrl.search;

  return new Request(originUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
    redirect: "manual",
  });
}

async function fetchFacebookCrawlerPage(request, config, productId) {
  const headers = new Headers(request.headers);
  headers.set("X-Customer-App-Url", config.customerAppUrl);
  return fetch(createOriginRequest(request, config.origin, `/api/bot-meta/san-pham/${encodeURIComponent(productId)}`, headers));
}

async function fetchApplication(request, config, pathname, isFacebookInApp) {
  const headers = new Headers(request.headers);
  headers.set("X-Customer-App-Url", config.customerAppUrl);
  if (isFacebookInApp) headers.set("X-Facebook-In-App", "1");
  return fetch(createOriginRequest(request, config.origin, pathname, headers));
}

export default {
  async fetch(request, env) {
    const cleanedUrl = removeTrackingParams(request.url);
    const config = getRuntimeConfig(env);
    const userAgent = request.headers.get("User-Agent") || "";
    const productId = getProductId(cleanedUrl.pathname);

    if (productId && isFacebookCrawler(userAgent)) {
      return fetchFacebookCrawlerPage(request, config, productId);
    }

    return fetchApplication(
      request,
      config,
      cleanedUrl.pathname,
      Boolean(productId && isFacebookInAppBrowser(userAgent)),
    );
  },
};
