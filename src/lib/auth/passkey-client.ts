export class PasskeyDomainError extends Error {
  constructor() {
    super(
      "Face ID/vân tay chỉ hoạt động trên bakery.printz.vn. Vui lòng mở lại trang chính để tiếp tục.",
    );
    this.name = "PasskeyDomainError";
  }
}

export function assertPasskeyRpMatchesCurrentHost(
  rpId: unknown,
  currentHostname?: string,
): void {
  if (typeof rpId !== "string" || !rpId) {
    return;
  }

  const hostname = (
    currentHostname ??
    (typeof window !== "undefined" ? window.location.hostname : "")
  ).toLowerCase();
  if (!hostname) return;
  const normalizedRpId = rpId.toLowerCase();
  const isValidRpHost =
    hostname === normalizedRpId || hostname.endsWith(`.${normalizedRpId}`);

  if (!isValidRpHost) throw new PasskeyDomainError();
}
