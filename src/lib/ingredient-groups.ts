import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import type { IngredientGroup, IngredientGroupInput } from "@/types";

const COLLECTION = "ingredient_groups";

type SeedGroup = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  displayOrder: number;
  defaultStorage?: string;
};

const ROOTS: SeedGroup[] = [
  ["flour-starch", "BOT", "Bột & tinh bột"],
  ["sugar-sweetener", "DUONG", "Đường & chất tạo ngọt"],
  ["dairy", "SUA", "Sữa & chế phẩm sữa"],
  ["egg", "TRUNG", "Trứng"],
  ["fat", "CHAT-BEO", "Chất béo"],
  ["chocolate-cocoa", "SOCOLA", "Chocolate & cacao"],
  ["nuts-dried-fruit", "HAT", "Hạt & trái cây khô"],
  ["fresh-produce", "TUOI", "Trái cây & nguyên liệu tươi"],
  ["leavening", "MEN", "Men & chất tạo nở"],
  ["flavour-additive", "PHU-GIA", "Hương liệu & phụ gia"],
  ["spice", "GIA-VI", "Gia vị"],
  ["prepared-filling", "NHAN", "Nhân & nguyên liệu chế biến sẵn"],
  ["packaging", "BAO-BI", "Bao bì"],
  ["consumable", "VTTH", "Vật tư tiêu hao"],
  ["other", "KHAC", "Khác"],
].map(([id, code, name], displayOrder) => ({
  id,
  code,
  name,
  parentId: null,
  displayOrder,
}));

const CHILDREN: SeedGroup[] = [
  ["wheat-flour", "BOT-MI", "Bột mì", "flour-starch"],
  ["rice-flour", "BOT-GAO", "Bột gạo", "flour-starch"],
  ["corn-starch", "BOT-BAP", "Bột bắp & tinh bột", "flour-starch"],
  ["granulated-sugar", "DUONG-CAT", "Đường cát", "sugar-sweetener"],
  ["powdered-sugar", "DUONG-BOT", "Đường bột", "sugar-sweetener"],
  ["syrup-honey", "SYRUP", "Mật ong & syrup", "sugar-sweetener"],
  ["fresh-milk", "SUA-TUOI", "Sữa tươi", "dairy"],
  ["cream-cheese", "KEM-PM", "Kem sữa & phô mai", "dairy"],
  ["butter", "BO", "Bơ", "fat"],
  ["vegetable-oil", "DAU", "Dầu thực vật", "fat"],
  ["dark-chocolate", "SCD", "Chocolate đen", "chocolate-cocoa"],
  ["white-chocolate", "SCT", "Chocolate trắng", "chocolate-cocoa"],
  ["cocoa", "CACAO", "Bột cacao", "chocolate-cocoa"],
  ["yeast", "MEN-NO", "Men", "leavening"],
  ["baking-agent", "BOT-NO", "Baking powder & baking soda", "leavening"],
  ["flavour", "HUONG", "Hương liệu", "flavour-additive"],
  ["colour", "MAU", "Màu thực phẩm", "flavour-additive"],
  ["gelatin", "GELATIN", "Gelatin & chất tạo đông", "flavour-additive"],
  ["box-tray", "HOP-KHAY", "Hộp & khay", "packaging"],
  ["bag-label", "TUI-TEM", "Túi & tem", "packaging"],
].map(([id, code, name, parentId], displayOrder) => ({
  id,
  code,
  name,
  parentId,
  displayOrder,
}));

const SEED_GROUPS = [...ROOTS, ...CHILDREN];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function fromDocument(
  id: string,
  data: FirebaseFirestore.DocumentData,
): IngredientGroup {
  const timestamp = (value: unknown) =>
    value && typeof (value as Timestamp).toDate === "function"
      ? (value as Timestamp).toDate().toISOString()
      : undefined;

  return {
    id,
    code: clean(data.code),
    name: clean(data.name),
    parentId: clean(data.parentId) || null,
    isActive: data.isActive !== false,
    displayOrder: Number(data.displayOrder) || 0,
    defaultStorage: clean(data.defaultStorage),
    defaultShelfLife: clean(data.defaultShelfLife),
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
  };
}

async function ensureSeeded(db: Firestore) {
  const collection = db.collection(COLLECTION);
  const existing = await collection.limit(1).get();
  if (!existing.empty) return;

  const batch = db.batch();
  for (const group of SEED_GROUPS) {
    batch.set(collection.doc(group.id), {
      ...group,
      isActive: true,
      defaultStorage: group.defaultStorage ?? "",
      defaultShelfLife: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function listIngredientGroups(db: Firestore) {
  await ensureSeeded(db);
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs
    .map((doc) => fromDocument(doc.id, doc.data()))
    .sort(
      (a, b) =>
        Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)) ||
        a.displayOrder - b.displayOrder ||
        a.name.localeCompare(b.name, "vi"),
    );
}

async function validateInput(
  db: Firestore,
  input: IngredientGroupInput,
  currentId?: string,
) {
  const name = clean(input.name);
  const parentId = clean(input.parentId) || null;
  const code = normalizeCode(clean(input.code) || name);

  if (!name) throw new Error("INGREDIENT_GROUP_NAME_REQUIRED");
  if (!code) throw new Error("INGREDIENT_GROUP_CODE_REQUIRED");

  if (parentId) {
    if (parentId === currentId) throw new Error("INGREDIENT_GROUP_INVALID_PARENT");
    if (currentId) {
      const children = await db
        .collection(COLLECTION)
        .where("parentId", "==", currentId)
        .limit(1)
        .get();
      if (!children.empty) throw new Error("INGREDIENT_GROUP_INVALID_PARENT");
    }
    const parent = await db.collection(COLLECTION).doc(parentId).get();
    if (!parent.exists || clean(parent.data()?.parentId)) {
      throw new Error("INGREDIENT_GROUP_INVALID_PARENT");
    }
  }

  const all = await db.collection(COLLECTION).get();
  const duplicate = all.docs.find((doc) => {
    if (doc.id === currentId) return false;
    const data = doc.data();
    return (
      normalizeCode(clean(data.code)) === code ||
      (clean(data.name).toLocaleLowerCase("vi") ===
        name.toLocaleLowerCase("vi") &&
        (clean(data.parentId) || null) === parentId)
    );
  });
  if (duplicate) throw new Error("INGREDIENT_GROUP_DUPLICATE");

  return {
    name,
    code,
    parentId,
    isActive: input.isActive !== false,
    displayOrder: Math.max(0, Number(input.displayOrder) || 0),
    defaultStorage: clean(input.defaultStorage),
    defaultShelfLife: clean(input.defaultShelfLife),
  };
}

export async function createIngredientGroup(
  db: Firestore,
  input: IngredientGroupInput,
) {
  await ensureSeeded(db);
  const data = await validateInput(db, input);
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, ...data } satisfies IngredientGroup;
}

export async function updateIngredientGroup(
  db: Firestore,
  id: string,
  input: IngredientGroupInput,
) {
  const ref = db.collection(COLLECTION).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error("INGREDIENT_GROUP_NOT_FOUND");
  const data = await validateInput(db, input, id);
  await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  return { id, ...data } satisfies IngredientGroup;
}

export async function deleteIngredientGroup(db: Firestore, id: string) {
  const ref = db.collection(COLLECTION).doc(id);
  const current = await ref.get();
  if (!current.exists) throw new Error("INGREDIENT_GROUP_NOT_FOUND");

  const currentName = clean(current.data()?.name);
  const [children, directProducts, subgroupProducts, legacyProducts] = await Promise.all([
    db.collection(COLLECTION).where("parentId", "==", id).limit(1).get(),
    db.collection("products").where("ingredientGroupId", "==", id).limit(1).get(),
    db
      .collection("products")
      .where("ingredientSubgroupId", "==", id)
      .limit(1)
      .get(),
    currentName
      ? db
          .collection("products")
          .where("ingredientGroup", "==", currentName)
          .limit(1)
          .get()
      : Promise.resolve(null),
  ]);
  if (!children.empty) throw new Error("INGREDIENT_GROUP_HAS_CHILDREN");
  if (
    !directProducts.empty ||
    !subgroupProducts.empty ||
    (legacyProducts && !legacyProducts.empty)
  ) {
    throw new Error("INGREDIENT_GROUP_IN_USE");
  }
  await ref.delete();
}

export async function getIngredientGroupSelectionError(
  db: Firestore,
  input: {
    itemType?: string;
    ingredientGroupId?: string;
    ingredientSubgroupId?: string;
  },
) {
  if (input.itemType !== "ingredient" || !input.ingredientGroupId) return null;

  const root = await db
    .collection(COLLECTION)
    .doc(input.ingredientGroupId)
    .get();
  if (
    !root.exists ||
    clean(root.data()?.parentId) ||
    root.data()?.isActive === false
  ) {
    return "Nhóm nguyên liệu chính không hợp lệ hoặc đã ngừng hoạt động.";
  }

  if (!input.ingredientSubgroupId) return null;
  const child = await db
    .collection(COLLECTION)
    .doc(input.ingredientSubgroupId)
    .get();
  if (
    !child.exists ||
    clean(child.data()?.parentId) !== input.ingredientGroupId ||
    child.data()?.isActive === false
  ) {
    return "Nhóm nguyên liệu con không hợp lệ hoặc đã ngừng hoạt động.";
  }
  return null;
}
