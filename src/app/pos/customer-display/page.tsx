import { CustomerDisplayShell } from "@/app/(admin)/admin/pos/customer-display/_components/CustomerDisplayShell";

type Props = {
  searchParams: Promise<{ session?: string; token?: string }>;
};

export default async function StandalonePosCustomerDisplayPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  return (
    <CustomerDisplayShell
      sessionId={params.session ?? ""}
      displayToken={params.token ?? ""}
    />
  );
}
