import { FavoritesClient } from "./favorites-client";
import { getProducts } from "@/lib/db";

export default async function FavoritesPage() {
  const products = await getProducts();

  return <FavoritesClient products={products} />;
}
