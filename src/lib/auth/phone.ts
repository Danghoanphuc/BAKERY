const VIETNAM_MOBILE_PHONE_REGEX = /^0[35789]\d{8}$/;

export function normalizePhoneInput(phone: string) {
  return phone.replace(/\D/g, "").slice(0, 10);
}

export function isValidVietnamMobilePhone(phone: string) {
  return VIETNAM_MOBILE_PHONE_REGEX.test(normalizePhoneInput(phone));
}

export function getVietnamPhoneValidationError(phone: string) {
  if (!isValidVietnamMobilePhone(phone)) {
    return "Hình như số điện thoại chưa đúng định dạng, bạn kiểm tra lại nhé!";
  }

  return null;
}
