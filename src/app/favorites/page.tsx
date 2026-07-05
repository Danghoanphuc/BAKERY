import { FavoritesClient } from "./favorites-client";
import { getProducts } from "@/lib/db";
import { serializeForClient } from "@/lib/firebase/utils";

export default async function FavoritesPage() {
  const products = await getProducts();

  return <FavoritesClient products={serializeForClient(products)} />;
}
