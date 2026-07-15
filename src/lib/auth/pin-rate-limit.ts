import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizePhoneInput } from "./phone";
import { getClientIp, hashPrivateIdentifier } from "./session-device";

const RATE_LIMIT_COLLECTION = "auth_rate_limits";
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const PHONE_MAX_FAILURES = 5;
const IP_MAX_FAILURES = 25;

export type PinRateLimitScope = "pin-login" | "pin-change";

type RateLimitBucket = {
  count: number;
  windowStartedAt: Date;
  blockedUntil?: Date;
};

export type PinRateLimitStatus = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }
  return new Date(0);
}

function normalizeBucket(data?: Record<string, unknown>): RateLimitBucket {
  return {
    count: typeof data?.count === "number" ? data.count : 0,
    windowStartedAt: toDate(data?.windowStartedAt),
    blockedUntil: data?.blockedUntil
      ? toDate(data.blockedUntil)
      : undefined,
  };
}

function getBucketIds(request: Request, phone: string, scope: PinRateLimitScope) {
  const normalizedPhone = normalizePhoneInput(phone);
  const ip = getClientIp(request);
  return {
    phone: hashPrivateIdentifier(`${scope}:phone:${normalizedPhone}`),
    ip: hashPrivateIdentifier(`${scope}:ip:${ip}`),
  };
}

function bucketRef(id: string) {
  return getAdminFirestore().collection(RATE_LIMIT_COLLECTION).doc(id);
}

async function getBucketStatus(id: string): Promise<PinRateLimitStatus> {
  const snapshot = await bucketRef(id).get();
  if (!snapshot.exists) return { allowed: true, retryAfterSeconds: 0 };

  const bucket = normalizeBucket(snapshot.data());
  const now = Date.now();
  const blockedUntil = bucket.blockedUntil?.getTime() ?? 0;
  if (blockedUntil <= now) return { allowed: true, retryAfterSeconds: 0 };

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
  };
}

export async function checkPinRateLimit(
  request: Request,
  phone: string,
  scope: PinRateLimitScope,
) {
  const ids = getBucketIds(request, phone, scope);
  const ipStatus = await getBucketStatus(ids.ip);
  if (!ipStatus.allowed) return ipStatus;

  return reservePhoneAttempt(ids.phone);
}

async function reservePhoneAttempt(id: string): Promise<PinRateLimitStatus> {
  const db = getAdminFirestore();
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(id);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = new Date();
    const current = snapshot.exists ? normalizeBucket(snapshot.data()) : null;
    const blockedUntil = current?.blockedUntil?.getTime() ?? 0;

    if (blockedUntil > now.getTime()) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((blockedUntil - now.getTime()) / 1000),
        ),
      };
    }

    const windowExpired =
      !current || now.getTime() - current.windowStartedAt.getTime() >= WINDOW_MS;
    const count = windowExpired ? 0 : current.count;

    if (count >= PHONE_MAX_FAILURES) {
      const nextBlockedUntil = new Date(now.getTime() + BLOCK_MS);
      transaction.set(
        ref,
        {
          blockedUntil: Timestamp.fromDate(nextBlockedUntil),
          updatedAt: Timestamp.fromDate(now),
        },
        { merge: true },
      );
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(BLOCK_MS / 1000),
      };
    }

    transaction.set(ref, {
      count: count + 1,
      windowStartedAt: Timestamp.fromDate(
        windowExpired ? now : current.windowStartedAt,
      ),
      updatedAt: Timestamp.fromDate(now),
    });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

async function recordBucketFailure(id: string, maxFailures: number) {
  const db = getAdminFirestore();
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(id);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = new Date();
    const current = snapshot.exists
      ? normalizeBucket(snapshot.data())
      : null;
    const windowExpired =
      !current || now.getTime() - current.windowStartedAt.getTime() >= WINDOW_MS;
    const count = windowExpired ? 1 : current.count + 1;

    transaction.set(ref, {
      count,
      windowStartedAt: Timestamp.fromDate(
        windowExpired ? now : current.windowStartedAt,
      ),
      ...(count >= maxFailures
        ? { blockedUntil: Timestamp.fromDate(new Date(now.getTime() + BLOCK_MS)) }
        : {}),
      updatedAt: Timestamp.fromDate(now),
    });
  });
}

export async function recordPinFailure(
  request: Request,
  phone: string,
  scope: PinRateLimitScope,
) {
  const ids = getBucketIds(request, phone, scope);
  await recordBucketFailure(ids.ip, IP_MAX_FAILURES);
}

export async function clearPinFailures(
  request: Request,
  phone: string,
  scope: PinRateLimitScope,
) {
  const { phone: phoneBucketId } = getBucketIds(request, phone, scope);
  await bucketRef(phoneBucketId).delete();
}

export function createPinRateLimitResponse(status: PinRateLimitStatus) {
  const minutes = Math.max(1, Math.ceil(status.retryAfterSeconds / 60));
  return new Response(
    JSON.stringify({
      error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      code: "pin_rate_limited",
      retryAfterSeconds: status.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(status.retryAfterSeconds),
      },
    },
  );
}
