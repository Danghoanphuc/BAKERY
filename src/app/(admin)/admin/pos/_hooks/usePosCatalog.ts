import { useCallback, useEffect, useState } from "react";
import type { Category, Product } from "@/types";
import { isCategoryVisible } from "@/lib/product-availability";
import { productBelongsToCategory } from "@/lib/product-category";
import { isProductSellableToday } from "../_lib/pos-utils";

type PosCatalogState = {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
};

export function usePosCatalog() {
  const [state, setState] = useState<PosCatalogState>({
    products: [],
    categories: [],
    isLoading: true,
    error: null,
  });

  const loadCatalog = useCallback(async () => {
    try {
      setState((previous) => ({ ...previous, isLoading: true, error: null }));

      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Không thể tải dữ liệu POS.");
      }

      const products = (await productsResponse.json()) as Product[];
      const categories = ((await categoriesResponse.json()) as Category[]).filter(
        isCategoryVisible,
      );

      setState({ products, categories, isLoading: false, error: null });
    } catch (loadError) {
      console.error("Failed to load POS catalog:", loadError);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: "Không thể tải dữ liệu POS.",
      }));
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  function filterProducts(
    products: Product[],
    searchTerm: string,
    selectedCategory: string | "all",
    categories: Category[] = state.categories,
  ) {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const selected = categories.find(
      (category) => category.id === selectedCategory,
    );

    return products
      .filter((product) => {
        if (selectedCategory === "all") return true;
        if (!selected) return product.categoryId === selectedCategory;
        return productBelongsToCategory(product, selected);
      })
      .filter((product) => {
        if (!normalizedSearch) return true;
        const haystack = [
          product.name,
          product.description,
          ...(product.tags ?? []),
          ...(product.searchKeywords ?? []),
          ...(product.occasionTags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftAvailable = isProductSellableToday(left) ? 1 : 0;
        const rightAvailable = isProductSellableToday(right) ? 1 : 0;
        return (
          rightAvailable - leftAvailable ||
          (right.sortPriority ?? 0) - (left.sortPriority ?? 0) ||
          left.name.localeCompare(right.name)
        );
      });
  }

  return {
    ...state,
    loadCatalog,
    filterProducts,
  };
}
