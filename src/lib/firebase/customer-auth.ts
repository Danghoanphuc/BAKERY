import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Customer } from "@/types";
import { db } from "./config";
import { getCustomerAuthByPhone } from "./customers";

const CUSTOMERS_COLLECTION = "customers";

export async function setCustomerPassword(customerId: string, password: string) {
  const passwordHash = hashPassword(password);

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), {
    passwordHash,
    passwordSetAt: serverTimestamp(),
    status: "active",
    updatedAt: serverTimestamp(),
  });
}

export async function verifyCustomerPassword(
  phone: string,
  password: string,
): Promise<Customer | null> {
  const customer = await getCustomerAuthByPhone(phone);

  if (!customer || customer.status === "paused") {
    return null;
  }

  if (!verifyPassword(password, customer.passwordHash)) {
    return null;
  }

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), {
    status: "active",
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    loyaltyPoints: customer.loyaltyPoints,
    tier: customer.tier,
    currentMagicLinkToken: customer.currentMagicLinkToken,
    magicLinkExpiresAt: customer.magicLinkExpiresAt,
    inviteSentAt: customer.inviteSentAt,
    lastOrderAt: customer.lastOrderAt,
    zaloUserId: customer.zaloUserId,
    hasPassword: customer.hasPassword,
    passwordSetAt: customer.passwordSetAt,
    personalization: customer.personalization,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    status: "active",
    lastLoginAt: new Date(),
  };
}
