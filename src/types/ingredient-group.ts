export interface IngredientGroup {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
  defaultStorage?: string;
  defaultShelfLife?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type IngredientGroupInput = Pick<
  IngredientGroup,
  "name" | "parentId"
> &
  Partial<
    Pick<
      IngredientGroup,
      | "code"
      | "isActive"
      | "displayOrder"
      | "defaultStorage"
      | "defaultShelfLife"
    >
  >;
