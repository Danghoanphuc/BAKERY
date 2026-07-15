export type CustomerStatus = "invited" | "active" | "paused";
export type LoyaltyTier = "new" | "silver" | "gold" | "vip";
export type MagicLinkStatus = "pending" | "used" | "expired";
export type CustomerRiskLevel = "green" | "yellow" | "red";
export type CustomerCareLogType =
  | "call"
  | "note"
  | "phone_verified"
  | "risk"
  | "voucher"
  | "points";
export type CustomerCareLogOutcome =
  | "confirmed"
  | "no_answer"
  | "wrong_number"
  | "callback"
  | "note";

export interface CustomerCareLog {
  id: string;
  type: CustomerCareLogType;
  title: string;
  note?: string;
  outcome?: CustomerCareLogOutcome;
  actor?: string;
  createdAt: Date;
}

export interface CustomerPointAdjustment {
  id: string;
  points: number;
  reason: string;
  actor?: string;
  createdAt: Date;
}

export interface CustomerVoucherIssue {
  id: string;
  voucherId?: string;
  voucherCode?: string;
  title: string;
  note?: string;
  actor?: string;
  createdAt: Date;
}

export interface CustomerAddressBookEntry {
  id: string;
  label: string;
  recipientName?: string;
  recipientPhone?: string;
  street: string;
  district: string;
  city: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  note?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPersonalization {
  birthday?: string;
  favoriteFlavors?: string[];
  favoriteProducts?: string[];
  dietaryNotes?: string;
  defaultDeliveryAddress?: string;
  addressBook?: CustomerAddressBookEntry[];
  specialOccasions?: string;
  notes?: string;
  sweetnessLevel?: "low" | "medium" | "high";
  favoriteCategories?: string[];
  typicalPartySize?: number;
  preferredBudget?: "under_100k" | "100k_300k" | "over_300k";
  orderNotifications?: boolean;
  marketingConsent?: boolean;
  consentUpdatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  gender?: "male" | "female" | "other";
  status: CustomerStatus;
  loyaltyPoints: number;
  tier: LoyaltyTier;
  currentMagicLinkToken?: string;
  magicLinkExpiresAt?: Date;
  inviteSentAt?: Date;
  lastOrderAt?: Date;
  lastLoginAt?: Date;
  phoneVerifiedAt?: Date;
  phoneVerificationMethod?: "admin" | "zalo";
  phoneVerificationNote?: string;
  zaloUserId?: string;
  hasPassword?: boolean;
  passwordSetAt?: Date;
  tags?: string[];
  internalNotes?: string;
  riskLevel?: CustomerRiskLevel;
  riskReason?: string;
  preferredChannel?: "phone" | "zalo" | "sms" | "email";
  careLogs?: CustomerCareLog[];
  pointAdjustments?: CustomerPointAdjustment[];
  issuedVouchers?: CustomerVoucherIssue[];
  personalization: CustomerPersonalization;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMagicLink {
  id: string;
  token: string;
  customerId: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  firstUserAgent?: string;
  firstIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  gender?: "male" | "female" | "other";
  status?: CustomerStatus;
  loyaltyPoints?: number;
  tier?: LoyaltyTier;
  currentMagicLinkToken?: string;
  magicLinkExpiresAt?: Date;
  phoneVerifiedAt?: Date;
  phoneVerificationMethod?: "admin" | "zalo";
  phoneVerificationNote?: string;
  zaloUserId?: string;
  tags?: string[];
  internalNotes?: string;
  riskLevel?: CustomerRiskLevel;
  riskReason?: string;
  preferredChannel?: "phone" | "zalo" | "sms" | "email";
  careLogs?: CustomerCareLog[];
  pointAdjustments?: CustomerPointAdjustment[];
  issuedVouchers?: CustomerVoucherIssue[];
  personalization?: CustomerPersonalization;
}

export interface MagicLinkResult {
  customer: Customer;
  token: string;
  urlPath: string;
  expiresAt: Date;
}
