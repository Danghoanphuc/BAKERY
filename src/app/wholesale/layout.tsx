import { AdminFrame } from "@/features/wholesale-admin/components";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, parseAdminSessionValue } from "@/lib/auth/admin-session";

export default async function WholesaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = parseAdminSessionValue((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) redirect("/admin-login");
  return <AdminFrame admin={{ id: session.id, name: session.name, role: session.role }}>{children}</AdminFrame>;
}
