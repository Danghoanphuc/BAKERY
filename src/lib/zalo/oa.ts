type SendZaloOaMagicLinkInput = {
  zaloUserId?: string;
  customerName: string;
  productName?: string;
  magicLinkUrl: string;
};

export type ZaloOaSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing_config" | "missing_zalo_user" }
  | { status: "failed"; reason: string };

export async function sendZaloOaMagicLink({
  zaloUserId,
  customerName,
  productName,
  magicLinkUrl,
}: SendZaloOaMagicLinkInput): Promise<ZaloOaSendResult> {
  const oaAccessToken = process.env.ZALO_OA_ACCESS_TOKEN;

  if (!oaAccessToken) {
    return { status: "skipped", reason: "missing_config" };
  }

  if (!zaloUserId) {
    return { status: "skipped", reason: "missing_zalo_user" };
  }

  const productText = productName ? ` ${productName}` : "";

  try {
    const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: oaAccessToken,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: {
          text: `Cảm ơn ${customerName} đã mua${productText} tại Bakery. Bấm vào link này để xem điểm thưởng và voucher của bạn: ${magicLinkUrl}`,
        },
      }),
    });

    if (!response.ok) {
      return { status: "failed", reason: `oa_http_${response.status}` };
    }

    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}