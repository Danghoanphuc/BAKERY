export type OpenAiFailureKind =
  | "configuration"
  | "network"
  | "quota"
  | "authentication"
  | "model"
  | "unknown";

const networkCodes = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

function readNumber(value: unknown, key: string): number | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  const parsed = Number((value as Record<string, unknown>)[key]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) return "";
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : "";
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && !visited.has(current) && chain.length < 8) {
    chain.push(current);
    visited.add(current);
    if (typeof current !== "object" || current === null || !("cause" in current)) break;
    current = (current as { cause?: unknown }).cause;
  }

  return chain;
}

export function classifyOpenAiFailure(error: unknown): OpenAiFailureKind {
  const chain = errorChain(error);
  const messages = chain.map((item) => readString(item, "message")).join(" ").toLowerCase();
  const codes = chain.map((item) => readString(item, "code").toUpperCase());
  const status = chain.map((item) => readNumber(item, "status")).find(Boolean) ?? 0;

  if (messages.includes("openai_api_key_not_configured")) return "configuration";
  if (codes.some((code) => networkCodes.has(code)) || messages.includes("fetch failed") || messages.includes("connection error")) {
    return "network";
  }
  if (status === 401 || codes.includes("INVALID_API_KEY")) return "authentication";
  if (status === 429 || codes.includes("INSUFFICIENT_QUOTA")) return "quota";
  if (status === 404 || codes.includes("MODEL_NOT_FOUND")) return "model";
  return "unknown";
}
