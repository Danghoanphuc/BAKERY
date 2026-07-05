const DEFAULT_PUBLIC_URL = "http://localhost:3000";

export function getPublicBaseUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    DEFAULT_PUBLIC_URL;
  const withProtocol = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  return withProtocol.replace(/\/$/, "");
}

export function toPublicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getPublicBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
