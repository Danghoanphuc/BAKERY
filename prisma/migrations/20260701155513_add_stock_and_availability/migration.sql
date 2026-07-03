-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "availableForDelivery" BOOLEAN NOT NULL DEFAULT true,
    "availableForPickup" BOOLEAN NOT NULL DEFAULT true,
    "requiresMessage" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isBestseller" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sizeOptions" TEXT,
    "flavorOptions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" ("availableForDelivery", "availableForPickup", "categoryId", "createdAt", "description", "flavorOptions", "id", "imageUrl", "isBestseller", "isFeatured", "isNew", "name", "price", "requiresMessage", "sizeOptions", "updatedAt") SELECT "availableForDelivery", "availableForPickup", "categoryId", "createdAt", "description", "flavorOptions", "id", "imageUrl", "isBestseller", "isFeatured", "isNew", "name", "price", "requiresMessage", "sizeOptions", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");
CREATE INDEX "products_isNew_idx" ON "products"("isNew");
CREATE INDEX "products_isBestseller_idx" ON "products"("isBestseller");
CREATE INDEX "products_isAvailable_idx" ON "products"("isAvailable");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
