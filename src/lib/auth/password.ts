import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;

  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    return "Mat khau can toi thieu 8 ky tu.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Mat khau nen co ca chu va so.";
  }
  return null;
}

export function validatePin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    return "Mã PIN cần đúng 4 chữ số.";
  }

  return null;
}
