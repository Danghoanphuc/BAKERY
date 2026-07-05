import { createHash, randomInt } from "crypto";

export const OTP_TTL_MINUTES = 10;

export function createOtpCode() {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string) {
  return hashOtp(code) === hash;
}
