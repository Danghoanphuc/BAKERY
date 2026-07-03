-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "totalAmount" REAL NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT,
    "pickupTime" DATETIME,
    "notes" TEXT,
    "items" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_orders" ("createdAt", "customerEmail", "customerName", "customerPhone", "deliveryAddress", "id", "items", "notes", "orderNumber", "orderType", "pickupTime", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "deliveryAddress", "id", "items", "notes", "orderNumber", "orderType", "pickupTime", "status", "totalAmount", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_orderType_idx" ON "orders"("orderType");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
