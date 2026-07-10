export type PaymentQrSource = {
  qrCode?: string;
  checkoutUrl?: string;
};

export function resolvePaymentQrImageSrc(source?: PaymentQrSource) {
  const qrCode = source?.qrCode?.trim();
  if (qrCode) {
    if (qrCode.startsWith("http") || qrCode.startsWith("data:")) {
      return qrCode;
    }

    return buildQrServerUrl(qrCode);
  }

  const checkoutUrl = source?.checkoutUrl?.trim();
  return checkoutUrl ? buildQrServerUrl(checkoutUrl) : undefined;
}

function buildQrServerUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    data,
  )}`;
}
