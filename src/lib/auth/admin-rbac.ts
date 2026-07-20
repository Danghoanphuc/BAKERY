export const ADMIN_ROLES = ["owner", "manager", "marketing", "finance", "cashier", "warehouse"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = ["dashboard", "pos", "orders", "customers", "marketing", "growth_studio", "finance", "catalog", "inventory", "wholesale", "security"] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AdminPrincipal = {
  id: string;
  name: string;
  role: AdminRole;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Chủ sở hữu",
  manager: "Quản lý vận hành",
  marketing: "Marketing",
  finance: "Tài chính",
  cashier: "Thu ngân",
  warehouse: "Kho & sản phẩm",
};

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  manager: ["dashboard", "pos", "orders", "customers", "marketing", "growth_studio", "catalog", "inventory", "wholesale"],
  marketing: ["dashboard", "customers", "marketing", "growth_studio"],
  finance: ["dashboard", "finance"],
  cashier: ["dashboard", "pos", "orders", "customers"],
  warehouse: ["dashboard", "orders", "catalog", "inventory", "wholesale"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getAdminPermissionForPath(pathname: string): AdminPermission {
  const rules: Array<[RegExp, AdminPermission]> = [
    [/^\/admin\/pos(?:\/|$)|^\/api\/pos(?:\/|$)|^\/api\/vouchers\/pos-redeem/, "pos"],
    [/^\/admin\/orders(?:\/|$)|^\/api\/admin\/orders(?:\/|$)/, "orders"],
    [/^\/admin\/customers(?:\/|$)|^\/api\/customers(?:\/|$)/, "customers"],
    [/^\/admin\/growth-studio(?:\/|$)|^\/api\/admin\/growth-studio(?:\/|$)/, "growth_studio"],
    [/^\/admin\/marketing(?:\/|$)|^\/api\/admin\/(?:loyalty|vouchers)(?:\/|$)|^\/api\/marketing(?:\/|$)/, "marketing"],
    [/^\/admin\/finance(?:\/|$)|^\/api\/(?:admin\/)?finance(?:\/|$)/, "finance"],
    [/^\/admin\/categories(?:\/|$)|^\/api\/(?:categories|products|uploads)(?:\/|$)|^\/api\/admin\/products(?:\/|$)/, "catalog"],
    [/^\/admin\/inventory(?:\/|$)|^\/api\/admin\/inventory(?:\/|$)/, "inventory"],
    [/^\/admin\/wholesale(?:\/|$)|^\/api\/admin\/wholesale(?:\/|$)/, "wholesale"],
    [/^\/admin\/security(?:\/|$)|^\/api\/admin\/security(?:\/|$)/, "security"],
  ];
  return rules.find(([pattern]) => pattern.test(pathname))?.[1] ?? "dashboard";
}

export function canAdminAccessPath(role: AdminRole, pathname: string) {
  return hasAdminPermission(role, getAdminPermissionForPath(pathname));
}

export function getAdminHomeForRole(role: AdminRole) {
  if (role === "finance") return "/admin/finance";
  if (role === "cashier") return "/admin/pos";
  if (role === "warehouse") return "/admin/inventory";
  if (role === "marketing") return "/admin/marketing";
  return "/admin";
}
