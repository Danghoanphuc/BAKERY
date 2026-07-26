import { IngredientCreateForm } from "@/features/inventory/components/IngredientCreateForm";

export default function NewIngredientPage() {
  return (
    <IngredientCreateForm
      apiPath="/api/wholesale/products"
      inventoryPath="/wholesale/inventory"
    />
  );
}
