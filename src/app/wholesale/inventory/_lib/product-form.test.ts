import { describe, expect, it } from "vitest";

import { createEmptyProductForm, productFormToPayload } from "./product-form";

describe("productFormToPayload", () => {
  it.each(["ingredient", "semi_finished"] as const)(
    "keeps imageUrl when saving a %s",
    (itemType) => {
      const formData = {
        ...createEmptyProductForm(),
        itemType,
        name: "Bột mì",
        imageUrl: "  https://res.cloudinary.com/demo/image.jpg  ",
        ingredientGroup: "Bột",
        manufacturingOutputUnit: "kg",
      };

      expect(productFormToPayload(formData)).toMatchObject({
        itemType,
        imageUrl: "https://res.cloudinary.com/demo/image.jpg",
      });
    },
  );
});
