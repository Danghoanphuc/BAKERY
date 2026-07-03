import { redirect } from "next/navigation";

export default function AccountSetupPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  redirect(token ? `/auth/magic?token=${token}` : "/account/login?error=missing_token");
}