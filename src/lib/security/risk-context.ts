import { normalizePhoneInput } from "@/lib/auth/phone";
import {
  getClientIp,
  getSessionDevice,
  hashPrivateIdentifier,
} from "@/lib/auth/session-device";
import { readVisitorHash } from "./visitor";

export type RiskContext = {
  visitor?: string;
  network: string;
  session?: string;
  customer?: string;
  phone?: string;
  address?: string;
  channel: string;
};

type RiskContextInput = {
  sessionId?: string;
  customerId?: string;
  phone?: string;
  address?: string;
};

export function buildRiskContext(
  request: Request,
  input: RiskContextInput = {},
): RiskContext {
  const device = getSessionDevice(request);
  const phone = input.phone ? normalizePhoneInput(input.phone) : "";
  const address = normalizeAddress(input.address);

  return {
    visitor: readVisitorHash(request),
    network: hashPrivateIdentifier(`risk:network:${getNetworkPrefix(getClientIp(request))}`),
    session: input.sessionId,
    customer: input.customerId
      ? hashPrivateIdentifier(`risk:customer:${input.customerId}`)
      : undefined,
    phone: phone
      ? hashPrivateIdentifier(`risk:phone:${phone}`)
      : undefined,
    address: address
      ? hashPrivateIdentifier(`risk:address:${address}`)
      : undefined,
    channel: device.deviceLabel.split(" · ")[0] || "Browser",
  };
}

export function getRiskSubjects(context: RiskContext) {
  return Object.entries(context)
    .filter(
      (entry): entry is [string, string] =>
        entry[0] !== "channel" && typeof entry[1] === "string",
    )
    .map(([kind, value]) => ({ kind, value }));
}

function normalizeAddress(value?: string) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 300);
}

function getNetworkPrefix(ip: string) {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : ip;
  }
  if (ip.includes(":")) return `${ip.split(":").slice(0, 4).join(":")}::/64`;
  return "unknown";
}

