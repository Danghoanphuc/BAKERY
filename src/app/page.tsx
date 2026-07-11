import { BakeryHome } from "@/features/home/components";
import { loadHomeData } from "@/features/home/server/load-home-data";
import { serializeForClient } from "@/lib/firebase/utils";

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function HomePage() {
  const data = await loadHomeData();
  return (
    <BakeryHome
      categories={serializeForClient(data.categories)}
      products={serializeForClient(data.products)}
    />
  );
}
