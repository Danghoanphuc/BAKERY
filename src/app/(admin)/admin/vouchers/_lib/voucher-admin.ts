import type {
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingDiscountType,
  VoucherAudience,
  VoucherBudgetMode,
  VoucherIssueMethod,
  VoucherProgramGoal,
  VoucherUseChannel,
} from "@/types";

export type VoucherWizardStep =
  | "goal"
  | "discount"
  | "budget"
  | "rules"
  | "audience"
  | "channels"
  | "review";

export type VoucherDraft = {
  programGoal: VoucherProgramGoal;
  name: string;
  code: string;
  internalDescription: string;
  customerDescription: string;
  status: "draft" | "active";
  discountType: MarketingDiscountType;
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  budgetMode: VoucherBudgetMode;
  issuedLimit: number;
  maxBudget: number;
  validDaysAfterIssue: number;
  maxUsesPerCustomer: number;
  stackable: boolean;
  audienceType: VoucherAudience;
  channels: VoucherUseChannel[];
  issueMethods: VoucherIssueMethod[];
};

export type VoucherGoalPreset = {
  id: VoucherProgramGoal;
  title: string;
  description: string;
  draft: Partial<VoucherDraft>;
};

export const voucherSteps: Array<{
  id: VoucherWizardStep;
  label: string;
}> = [
  { id: "goal", label: "Mục tiêu" },
  { id: "discount", label: "Ưu đãi" },
  { id: "budget", label: "Ngân sách" },
  { id: "rules", label: "Điều kiện" },
  { id: "audience", label: "Đối tượng" },
  { id: "channels", label: "Kênh dùng" },
  { id: "review", label: "Xem lại" },
];

export const defaultVoucherDraft: VoucherDraft = {
  programGoal: "new_customer",
  name: "Ưu đãi khách mới tháng 7",
  code: "NEW50",
  internalDescription: "Chương trình thu hút khách hàng mới.",
  customerDescription: "Giảm 50% cho đơn đầu tiên, tối đa 50.000đ.",
  status: "draft",
  discountType: "percent",
  discountValue: 50,
  maxDiscountAmount: 50000,
  minOrderValue: 80000,
  budgetMode: "both",
  issuedLimit: 100,
  maxBudget: 5000000,
  validDaysAfterIssue: 30,
  maxUsesPerCustomer: 1,
  stackable: false,
  audienceType: "new_customers",
  channels: ["pos_pickup_now", "web_pickup_later", "web_delivery"],
  issueMethods: ["public"],
};

export const voucherGoalPresets: VoucherGoalPreset[] = [
  {
    id: "new_customer",
    title: "Thu hút khách mới",
    description: "Giảm mạnh cho người lần đầu mua.",
    draft: {
      name: "Khách mới giảm 50%",
      code: "NEW50",
      customerDescription: "Giảm 50% cho đơn đầu tiên, tối đa 50.000đ.",
      discountType: "percent",
      discountValue: 50,
      maxDiscountAmount: 50000,
      minOrderValue: 80000,
      maxBudget: 5000000,
      issuedLimit: 100,
      validDaysAfterIssue: 30,
      audienceType: "new_customers",
      issueMethods: ["public"],
    },
  },
  {
    id: "returning_customer",
    title: "Kéo khách quay lại",
    description: "Tặng mã mua lần sau trên bill hoặc tin nhắn.",
    draft: {
      name: "Mua lần sau giảm 10k",
      code: "BACK10",
      customerDescription: "Giảm 10.000đ cho đơn tiếp theo từ 50.000đ.",
      discountType: "amount",
      discountValue: 10000,
      maxDiscountAmount: 10000,
      minOrderValue: 50000,
      maxBudget: 2000000,
      issuedLimit: 200,
      validDaysAfterIssue: 7,
      audienceType: "after_purchase",
      issueMethods: ["auto_after_order", "print"],
    },
  },
  {
    id: "birthday",
    title: "Khuyến mãi sinh nhật",
    description: "Chăm sóc khách có ngày sinh trong tháng.",
    draft: {
      name: "Quà sinh nhật",
      code: "BDAY20",
      customerDescription: "Giảm 20% cho đơn sinh nhật, tối đa 40.000đ.",
      discountType: "percent",
      discountValue: 20,
      maxDiscountAmount: 40000,
      minOrderValue: 100000,
      audienceType: "birthday_customers",
      validDaysAfterIssue: 30,
    },
  },
  {
    id: "preorder",
    title: "Tăng đơn đặt trước",
    description: "Khuyến khích khách đặt bánh sớm để tiệm chuẩn bị tốt hơn.",
    draft: {
      name: "Đặt trước giảm 15k",
      code: "PRE15",
      customerDescription: "Giảm 15.000đ cho đơn đặt trước từ 80.000đ.",
      discountType: "amount",
      discountValue: 15000,
      maxDiscountAmount: 15000,
      minOrderValue: 80000,
      channels: ["web_pickup_later"],
      audienceType: "all",
    },
  },
  {
    id: "happy_hour",
    title: "Xả hàng cuối ngày",
    description: "Đẩy hàng nhanh vào khung giờ thấp điểm hoặc cuối ngày.",
    draft: {
      name: "Giờ vàng cuối ngày",
      code: "GIOVANG",
      customerDescription: "Giảm 20% cho một số món cuối ngày.",
      discountType: "percent",
      discountValue: 20,
      maxDiscountAmount: 30000,
      minOrderValue: 50000,
      validDaysAfterIssue: 1,
      audienceType: "all",
    },
  },
  {
    id: "custom",
    title: "Tự tạo chương trình riêng",
    description: "Bắt đầu từ cấu hình trống và tự điều chỉnh.",
    draft: {},
  },
];

export const discountTypeLabels: Record<MarketingDiscountType, string> = {
  percent: "Giảm phần trăm",
  amount: "Giảm số tiền",
  gift_item: "Tặng món",
  free_shipping: "Miễn phí giao hàng",
  buy_x_get_y: "Mua X tặng Y",
  points_multiplier: "Nhân điểm",
};

export const audienceLabels: Record<VoucherAudience, string> = {
  all: "Tất cả khách",
  new_customers: "Khách mới",
  existing_customers: "Khách đã từng mua",
  inactive_customers: "Khách lâu rồi chưa quay lại",
  birthday_customers: "Khách sinh nhật",
  specific_customers: "Danh sách khách cụ thể",
  after_purchase: "Khách sau khi mua hàng",
};

export const channelLabels: Record<VoucherUseChannel, string> = {
  pos_pickup_now: "Tại quầy",
  web_pickup_later: "Đặt trước - đến lấy sau",
  web_delivery: "Giao tận nơi",
};

export const issueMethodLabels: Record<VoucherIssueMethod, string> = {
  public: "Hiển thị công khai",
  auto_after_order: "Tự động sau đơn hàng",
  manual_phone: "Phát thủ công theo số điện thoại",
  segment: "Phát cho nhóm khách",
  print: "In QR/poster/bill",
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function getDiscountPreview(subtotal: number, draft: VoucherDraft) {
  if (subtotal < draft.minOrderValue) {
    return {
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      eligible: false,
    };
  }

  const rawDiscount =
    draft.discountType === "percent"
      ? Math.floor((subtotal * draft.discountValue) / 100)
      : draft.discountType === "amount"
        ? draft.discountValue
        : draft.discountType === "free_shipping"
          ? 0
          : 0;
  const discountAmount = Math.min(
    rawDiscount,
    draft.maxDiscountAmount || rawDiscount,
  );

  return {
    discountAmount,
    totalAfterDiscount: Math.max(0, subtotal - discountAmount),
    eligible: true,
  };
}

export function getMaxPromotionBudget(draft: VoucherDraft) {
  if (draft.budgetMode === "budget") return draft.maxBudget;
  const calculated = draft.issuedLimit * (draft.maxDiscountAmount || 0);
  if (draft.budgetMode === "quantity") return calculated;
  return Math.min(draft.maxBudget || calculated, calculated || draft.maxBudget);
}

export function getIssuedLimitFromBudget(draft: VoucherDraft) {
  if (!draft.maxDiscountAmount) return draft.issuedLimit;
  return Math.floor(draft.maxBudget / draft.maxDiscountAmount);
}

export function buildVoucherCampaignPayload(
  draft: VoucherDraft,
): MarketingCampaignInput {
  const metrics = {
    issuedCount: 0,
    redeemedCount: 0,
    discountSpent: 0,
    revenueGenerated: 0,
  };

  return {
    name: draft.name,
    type: "voucher",
    status: draft.status,
    code: draft.code,
    codePrefix: draft.code,
    title: draft.name,
    description: draft.customerDescription,
    internalDescription: draft.internalDescription,
    customerDescription: draft.customerDescription,
    audience: audienceLabels[draft.audienceType],
    audienceType: draft.audienceType,
    channel: draft.channels.map((channel) => channelLabels[channel]).join(", "),
    channels: draft.channels,
    budget: draft.maxBudget,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    minOrderValue: draft.minOrderValue,
    maxDiscountAmount: draft.maxDiscountAmount,
    usageLimit: draft.issuedLimit,
    usedCount: 0,
    isFeatured: draft.issueMethods.includes("public"),
    programGoal: draft.programGoal,
    rules: {
      maxDiscountAmount: draft.maxDiscountAmount,
      minOrderValue: draft.minOrderValue,
      applicationScope: "entire_order",
      validDaysAfterIssue: draft.validDaysAfterIssue,
      maxUsesPerCustomer: draft.maxUsesPerCustomer,
      stackable: draft.stackable,
    },
    voucherBudget: {
      mode: draft.budgetMode,
      issuedLimit: draft.issuedLimit,
      maxBudget: draft.maxBudget,
      maxDiscountPerVoucher: draft.maxDiscountAmount,
    },
    metrics,
    publishing: {
      issueMethods: draft.issueMethods,
      isPublic: draft.issueMethods.includes("public"),
      autoIssueAfterOrder: draft.issueMethods.includes("auto_after_order"),
      printOnBill: draft.issueMethods.includes("print"),
    },
  };
}

export function getVoucherMetrics(campaign: MarketingCampaign) {
  const issuedLimit =
    campaign.voucherBudget?.issuedLimit ?? campaign.usageLimit ?? 0;
  const issuedCount = campaign.metrics?.issuedCount ?? campaign.usedCount ?? 0;
  const redeemedCount = campaign.metrics?.redeemedCount ?? campaign.usedCount;
  const discountSpent = campaign.metrics?.discountSpent ?? 0;
  const revenueGenerated = campaign.metrics?.revenueGenerated ?? 0;
  const usageRate =
    issuedCount > 0 ? Math.round((redeemedCount / issuedCount) * 1000) / 10 : 0;

  return {
    issuedLimit,
    issuedCount,
    redeemedCount,
    discountSpent,
    revenueGenerated,
    usageRate,
  };
}
