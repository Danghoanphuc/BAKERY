import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { createOtpCode, hashOtp, OTP_TTL_MINUTES, verifyOtpCode } from "@/lib/auth/otp";
import type { Customer, CustomerInput } from "@/types";
import { db } from "./config";
import {
  createCustomer,
  getCustomerByPhone,
  updateCustomer,
} from "./customers";

const CUSTOMER_OTPS_COLLECTION = "customer_otps";

type OtpDoc = {
  id: string;
  phone: string;
  customerId: string;
  codeHash: string;
  expiresAt: Date;
  isUsed: boolean;
};

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

export async function requestCustomerOtp(input: CustomerInput): Promise<{
  customer: Customer;
  otp: string;
  expiresAt: Date;
  isNewCustomer: boolean;
}> {
  const phone = normalizePhone(input.phone);
  const existingCustomer = await getCustomerByPhone(phone);
  const isNewCustomer = !existingCustomer;
  const customer =
    existingCustomer ??
    (await createCustomer({
      ...input,
      phone,
      status: "invited",
      personalization: input.personalization ?? {},
    }));

  if (existingCustomer) {
    await updateCustomer(existingCustomer.id, {
      name: input.name || existingCustomer.name,
      email: input.email ?? existingCustomer.email,
      birthday: input.birthday ?? existingCustomer.birthday,
      gender: input.gender ?? existingCustomer.gender,
      personalization: {
        ...existingCustomer.personalization,
        ...input.personalization,
      },
    });
  }

  const otp = createOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await addDoc(collection(db, CUSTOMER_OTPS_COLLECTION), {
    phone,
    customerId: customer.id,
    codeHash: hashOtp(otp),
    expiresAt,
    isUsed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { customer, otp, expiresAt, isNewCustomer };
}

export async function verifyCustomerOtp(
  phone: string,
  code: string,
): Promise<Customer | null> {
  const normalizedPhone = normalizePhone(phone);
  const snapshot = await getDocs(
    query(
      collection(db, CUSTOMER_OTPS_COLLECTION),
      where("phone", "==", normalizedPhone),
      where("isUsed", "==", false),
      limit(10),
    ),
  );

  const candidates = snapshot.docs
    .map((otpDoc) => {
      const data = otpDoc.data() as Record<string, unknown>;
      const expiresAt =
        data.expiresAt &&
        typeof data.expiresAt === "object" &&
        "toDate" in data.expiresAt &&
        typeof data.expiresAt.toDate === "function"
          ? data.expiresAt.toDate()
          : new Date(String(data.expiresAt));

      return {
        id: otpDoc.id,
        phone: String(data.phone ?? ""),
        customerId: String(data.customerId ?? ""),
        codeHash: String(data.codeHash ?? ""),
        expiresAt,
        isUsed: Boolean(data.isUsed),
      } satisfies OtpDoc;
    })
    .filter((otpDoc) => otpDoc.expiresAt.getTime() >= Date.now());

  const match = candidates.find((otpDoc) => verifyOtpCode(code, otpDoc.codeHash));

  if (!match) return null;

  await updateDoc(doc(db, CUSTOMER_OTPS_COLLECTION, match.id), {
    isUsed: true,
    usedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateCustomer(match.customerId, {
    status: "active",
  });

  return getCustomerByPhone(normalizedPhone);
}
