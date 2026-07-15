import { createHash, randomUUID } from "crypto";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { getRiskSubjects, type RiskContext } from "./risk-context";

const COUNTERS_COLLECTION = "security_counters";
const EVENTS_COLLECTION = "security_events";

export type SecurityEventType =
  | "pin_failed"
  | "login_succeeded"
  | "registration_created"
  | "order_created"
  | "cod_order_created"
  | "voucher_redeemed"
  | "challenge_failed"
  | "challenge_passed"
  | "passkey_registered"
  | "passkey_login_succeeded";

export type SecurityLimit = {
  subject: keyof Omit<RiskContext, "channel">;
  max: number;
  windowMs: number;
};

export type SecurityLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  subject?: SecurityLimit["subject"];
};

function counterId(eventType: string, subjectKind: string, subjectValue: string) {
  return createHash("sha256")
    .update(`${eventType}:${subjectKind}:${subjectValue}`)
    .digest("hex");
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    const converter = value as { toDate?: () => Date };
    if (typeof converter.toDate === "function") return converter.toDate();
  }
  return new Date(0);
}

export async function consumeSecurityAction(
  eventType: string,
  context: RiskContext,
  limits: SecurityLimit[],
  metadata: Record<string, string | number | boolean> = {},
): Promise<SecurityLimitResult> {
  const applicable = limits.flatMap((limit) => {
    const value = context[limit.subject];
    return typeof value === "string" ? [{ ...limit, value }] : [];
  });
  if (applicable.length === 0) {
    await recordSecurityEvent(eventType, context, metadata);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const db = getAdminFirestore();
  const refs = applicable.map((limit) =>
    db.collection(COUNTERS_COLLECTION).doc(
      counterId(eventType, limit.subject, limit.value),
    ),
  );

  const result = await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const now = new Date();
    const states = snapshots.map((snapshot, index) => {
      const limit = applicable[index];
      const data = snapshot.data();
      const startedAt = toDate(data?.windowStartedAt);
      const expired = now.getTime() - startedAt.getTime() >= limit.windowMs;
      return {
        limit,
        ref: refs[index],
        startedAt: expired ? now : startedAt,
        count: expired ? 0 : typeof data?.count === "number" ? data.count : 0,
      };
    });
    const denied = states.find((state) => state.count >= state.limit.max);
    if (denied) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(
            (denied.startedAt.getTime() + denied.limit.windowMs - now.getTime()) /
              1000,
          ),
        ),
        subject: denied.limit.subject,
      } satisfies SecurityLimitResult;
    }

    states.forEach((state) => {
      transaction.set(state.ref, {
        eventType,
        subjectKind: state.limit.subject,
        count: state.count + 1,
        windowStartedAt: Timestamp.fromDate(state.startedAt),
        updatedAt: Timestamp.fromDate(now),
        deleteAfter: Timestamp.fromDate(
          new Date(now.getTime() + Math.max(state.limit.windowMs * 2, 86_400_000)),
        ),
      });
    });
    return { allowed: true, retryAfterSeconds: 0 } satisfies SecurityLimitResult;
  });

  if (result.allowed) await writeSecurityEvent(eventType, context, metadata);
  return result;
}

export async function recordSecurityEvent(
  eventType: SecurityEventType | string,
  context: RiskContext,
  metadata: Record<string, string | number | boolean> = {},
) {
  await writeSecurityEvent(eventType, context, metadata);
}

async function writeSecurityEvent(
  eventType: string,
  context: RiskContext,
  metadata: Record<string, string | number | boolean>,
) {
  const now = new Date();
  await getAdminFirestore().collection(EVENTS_COLLECTION).doc(randomUUID()).set({
    eventType,
    channel: context.channel,
    subjects: getRiskSubjects(context).map(({ kind, value }) => ({ kind, value })),
    metadata,
    createdAt: Timestamp.fromDate(now),
    deleteAfter: Timestamp.fromDate(new Date(now.getTime() + 90 * 86_400_000)),
  });
}

export function createSecurityLimitResponse(result: SecurityLimitResult) {
  return new Response(
    JSON.stringify({
      error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      code: "security_rate_limited",
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}

export async function listRecentSecurityEvents(limitCount = 100) {
  const snapshot = await getAdminFirestore()
    .collection(EVENTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(limitCount, 1), 200))
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      eventType: String(data.eventType ?? "unknown"),
      channel: String(data.channel ?? "Browser"),
      subjectKinds: Array.isArray(data.subjects)
        ? data.subjects
            .map((subject) =>
              subject && typeof subject === "object" && "kind" in subject
                ? String(subject.kind)
                : null,
            )
            .filter((kind): kind is string => Boolean(kind))
        : [],
      metadata:
        data.metadata && typeof data.metadata === "object" ? data.metadata : {},
      createdAt: toDate(data.createdAt).toISOString(),
    };
  });
}
