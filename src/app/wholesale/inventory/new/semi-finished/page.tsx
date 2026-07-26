import { SemiFinishedCreateForm } from "@/features/inventory/components/SemiFinishedCreateForm";

export default function NewSemiFinishedPage() {
  return (
    <SemiFinishedCreateForm
      apiPath="/api/wholesale/products"
      inventoryPath="/wholesale/inventory"
    />
  );
}
