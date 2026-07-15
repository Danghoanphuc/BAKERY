const DEFAULT_ORIGIN = "https://bakery-production-9c75.up.railway.app";
const DEFAULT_CUSTOMER_APP_URL = "https://bakery.printz.vn";
const TRACKING_PARAMS = new Set(["fbclid", "zarsrc", "gclid"]);
const RETRY_DELAYS_MS = [120, 360];
const MAX_PUBLIC_RELOADS = 2;

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
  return fetchOriginWithRetry(() =>
    createOriginRequest(
      request,
      config.origin,
      `/api/bot-meta/san-pham/${encodeURIComponent(productId)}`,
      headers,
    ),
  );
}

async function fetchApplication(request, config, pathname, isFacebookInApp) {
  const headers = new Headers(request.headers);
  const incomingUrl = new URL(request.url);
  headers.set("X-Customer-App-Url", config.customerAppUrl);
  headers.set("X-Forwarded-Host", incomingUrl.host);
  headers.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));
  if (isFacebookInApp) headers.set("X-Facebook-In-App", "1");
  const response = await fetchOriginWithRetry(
    () => createOriginRequest(request, config.origin, pathname, headers),
    request.method,
  );

  return rewriteOriginRedirect(response, request, config.origin);
}

function rewriteOriginRedirect(response, request, origin) {
  const location = response.headers.get("Location");
  if (!location || response.status < 300 || response.status >= 400) {
    return response;
  }

  const originUrl = new URL(origin);
  const redirectUrl = new URL(location, originUrl);
  if (redirectUrl.origin !== originUrl.origin) return response;

  const publicUrl = new URL(request.url);
  publicUrl.pathname = redirectUrl.pathname;
  publicUrl.search = redirectUrl.search;
  publicUrl.hash = redirectUrl.hash;

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Location", publicUrl.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function isRetryableResponse(response) {
  return response.status === 429 || response.status >= 500;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchOriginWithRetry(createRequest, method = "GET") {
  const canRetry = method === "GET" || method === "HEAD";
  let lastResponse;
  let lastError;
  const attempts = canRetry ? RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(createRequest());
      if (!isRetryableResponse(response) || attempt === attempts - 1) {
        return response;
      }
      lastResponse = response;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }

    await wait(RETRY_DELAYS_MS[attempt]);
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("Origin request failed");
}

function createFacebookOriginFallback(request, pathname) {
  const incomingUrl = new URL(request.url);
  const reloadCount = Number.parseInt(
    incomingUrl.searchParams.get("__edge_retry") || "0",
    10,
  );

  if (reloadCount >= MAX_PUBLIC_RELOADS) {
    return new Response(
      "Tạm thời không thể tải trang. Vui lòng thử lại sau ít phút.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "5",
        },
      },
    );
  }

  const fallbackUrl = new URL(incomingUrl.origin);
  fallbackUrl.pathname = pathname;
  fallbackUrl.search = incomingUrl.search;
  for (const param of TRACKING_PARAMS) fallbackUrl.searchParams.delete(param);
  fallbackUrl.searchParams.set("__fb_iab", "1");
  fallbackUrl.searchParams.set("__edge_retry", String(reloadCount + 1));

  return Response.redirect(fallbackUrl.toString(), 307);
}

export default {
  async fetch(request, env) {
    const cleanedUrl = removeTrackingParams(request.url);
    const config = getRuntimeConfig(env);
    const userAgent = request.headers.get("User-Agent") || "";
    const productId = getProductId(cleanedUrl.pathname);

    const isFacebookInApp = Boolean(
      productId && isFacebookInAppBrowser(userAgent),
    );

    try {
      if (productId && isFacebookCrawler(userAgent)) {
        return await fetchFacebookCrawlerPage(request, config, productId);
      }

      const response = await fetchApplication(
        request,
        config,
        cleanedUrl.pathname,
        isFacebookInApp,
      );

      if (isFacebookInApp && isRetryableResponse(response)) {
        await response.body?.cancel();
        return createFacebookOriginFallback(
          request,
          cleanedUrl.pathname,
        );
      }

      return response;
    } catch (error) {
      if (isFacebookInApp) {
        return createFacebookOriginFallback(
          request,
          cleanedUrl.pathname,
        );
      }
      throw error;
    }
  },
};
