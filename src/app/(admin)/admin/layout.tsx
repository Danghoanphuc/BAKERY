import { AdminFrame } from "@/features/admin/components";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminFrame>{children}</AdminFrame>;
}
