import { createHmac } from "crypto";

function getAuthHashSecret() {
  const secret =
    process.env.AUTH_HASH_SECRET || process.env.CUSTOMER_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_HASH_SECRET is required in production");
  }
  return "dev-auth-hash-secret";
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function hashPrivateIdentifier(value: string) {
  return createHmac("sha256", getAuthHashSecret())
    .update(value)
    .digest("hex");
}

export function getSessionDevice(request?: Request) {
  const userAgent = request?.headers.get("user-agent")?.slice(0, 500) || "";
  const normalized = userAgent.toLowerCase();

  const browser = normalized.includes("messenger") || normalized.includes("orcamessenger")
    ? "Messenger"
    : normalized.includes("fban") ||
        normalized.includes("fbav") ||
        normalized.includes("fb_iab")
      ? "Facebook"
      : normalized.includes("zalo")
        ? "Zalo"
        : normalized.includes("edg/")
          ? "Microsoft Edge"
          : normalized.includes("crios") || normalized.includes("chrome")
            ? "Chrome"
            : normalized.includes("safari")
              ? "Safari"
              : "Trình duyệt";

  const platform = normalized.includes("iphone") || normalized.includes("ipad")
    ? "iPhone/iPad"
    : normalized.includes("android")
      ? "Android"
      : normalized.includes("windows")
        ? "Windows"
        : normalized.includes("macintosh")
          ? "macOS"
          : "Thiết bị";

  const clientIp = request ? getClientIp(request) : "unknown";
  return {
    deviceLabel: `${browser} · ${platform}`,
    userAgent,
    ipHash:
      clientIp === "unknown"
        ? undefined
        : hashPrivateIdentifier(`ip:${clientIp}`),
  };
}
