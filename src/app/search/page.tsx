import { getCategories, getProducts } from "@/lib/db";
import { SearchExperience } from "./search-experience";

export default async function SearchPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return <SearchExperience products={products} categories={categories} />;
}
