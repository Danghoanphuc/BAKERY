import { BakeryHome } from "@/features/home/components";
import { loadHomeData } from "@/features/home/server/load-home-data";
import { serializeForClient } from "@/lib/firebase/utils";

export default async function HomePage() {
  const data = await loadHomeData();
  return (
    <BakeryHome
      categories={serializeForClient(data.categories)}
      favoriteProducts={serializeForClient(data.favoriteProducts)}
    />
  );
}
