import { getCategories, getProducts } from "@/lib/db";
import { serializeForClient } from "@/lib/firebase/utils";
import { SearchExperience } from "./search-experience";

export default async function SearchPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <SearchExperience
      products={serializeForClient(products)}
      categories={serializeForClient(categories)}
    />
  );
}
