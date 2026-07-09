export function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function sanitizePin(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function isValidVietnamPhone(value: string) {
  return /^0[35789]\d{8}$/.test(value);
}

export function getPhoneError(value: string) {
  return isValidVietnamPhone(value)
    ? null
    : "Hình như số điện thoại chưa đúng định dạng, bạn kiểm tra lại nhé!";
}
