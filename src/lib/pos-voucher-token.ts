export type PosVoucherTokenPayload = {
  voucherId?: string;
  code: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  issuedAt: number;
  nonce: string;
  channel: "pos_pickup_now";
};

const TOKEN_PREFIX = "BKV1:";

function base64UrlEncode(value: string) {
  if (typeof window !== "undefined") {
    return btoa(unescape(encodeURIComponent(value)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  if (typeof window !== "undefined") {
    return decodeURIComponent(escape(atob(padded)));
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

export function createPosVoucherToken({
  voucherId,
  code,
  customerId,
  customerName,
  customerPhone,
}: {
  voucherId?: string;
  code: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const payload: PosVoucherTokenPayload = {
    voucherId,
    code: code.trim().toUpperCase(),
    customerId,
    customerName,
    customerPhone: customerPhone?.replace(/\s+/g, "").trim(),
    issuedAt: Date.now(),
    nonce,
    channel: "pos_pickup_now",
  };

  return `${TOKEN_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
}

export function parsePosVoucherToken(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(trimmed.slice(TOKEN_PREFIX.length)),
    ) as Partial<PosVoucherTokenPayload>;

    if (
      payload.channel !== "pos_pickup_now" ||
      typeof payload.code !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.nonce !== "string"
    ) {
      return null;
    }

    return payload as PosVoucherTokenPayload;
  } catch {
    return null;
  }
}

export function getVoucherCodeFromScanInput(input: string) {
  const token = parsePosVoucherToken(input);
  return token?.code ?? input.trim().toUpperCase();
}
