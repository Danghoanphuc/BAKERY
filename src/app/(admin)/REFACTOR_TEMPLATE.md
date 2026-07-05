# Template Refactor cho Admin Modules

## 📝 Checklist refactor

### Phase 1: Setup Structure

```bash
# Tạo cấu trúc thư mục
cd src/app/(admin)/admin/[MODULE_NAME]
mkdir _components _hooks _lib _api

# Backup file gốc
# File gốc sẽ tự động được đổi tên khi tạo file mới
```

### Phase 2: Extract Constants & Utils

#### File 1: `_lib/constants.ts`

```typescript
// Template
import type { YourType } from "@/types";

export const STATUS_LABELS: Record<Status, string> = {
  active: "Đang hoạt động",
  inactive: "Không hoạt động",
};

export const TYPE_LABELS: Record<Type, string> = {
  type1: "Loại 1",
  type2: "Loại 2",
};

// Export types nếu cần
export type FilterType = "all" | Status;
```

#### File 2: `_lib/[module]-utils.ts`

```typescript
// Template
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function formatDate(date: Date | string): string {
  // Implementation
}

// Thêm các helper functions khác
```

### Phase 3: Create Hooks

#### File: `_hooks/use[ModuleName].ts`

```typescript
// Template
import { useState, useEffect, useMemo } from "react";
import type { YourDataType } from "@/types";

export function use[ModuleName]() {
  const [data, setData] = useState<YourDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/[endpoint]");
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setData(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load:", err);
      setError("Không thể tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return {
    data,
    setData,
    isLoading,
    error,
    setError,
    loadData,
  };
}

// Custom hooks khác cho filtering, stats, etc.
export function use[ModuleName]Filters(data, filters) {
  return useMemo(() => {
    // Filter logic
    return filtered;
  }, [data, filters]);
}

export function use[ModuleName]Stats(data) {
  return useMemo(() => {
    // Calculate stats
    return stats;
  }, [data]);
}
```

### Phase 4: Create API Layer

#### File: `_api/[module]Api.ts`

```typescript
// Template
import type { YourDataType } from "@/types";

export async function updateItemApi(
  id: string,
  payload: Partial<YourDataType>,
): Promise<YourDataType> {
  const response = await fetch(`/api/[endpoint]/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Không thể cập nhật.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteItemApi(id: string): Promise<void> {
  const response = await fetch(`/api/[endpoint]/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Không thể xóa.");
  }
}

// Thêm các API functions khác
```

### Phase 5: Extract Components

#### Component Template

```typescript
// _components/[ComponentName].tsx
import type { PropsType } from "@/types";

type ComponentProps = {
  data: DataType;
  onAction: () => void;
  isLoading?: boolean;
};

export function ComponentName(props: ComponentProps) {
  return (
    <div>
      {/* Component UI */}
    </div>
  );
}

// Helper sub-components nếu cần
function SubComponent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

#### Common Components cần tách:

1. **Stats Card Component**

```typescript
// _components/[Module]Stats.tsx
export function ModuleStats(props: StatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Stats cards */}
    </div>
  );
}
```

2. **Filter Component**

```typescript
// _components/[Module]Filters.tsx
export function ModuleFilters(props: FilterProps) {
  return (
    <div>
      {/* Search, filters, etc. */}
    </div>
  );
}
```

3. **Table Component**

```typescript
// _components/[Module]Table.tsx
export function ModuleTable(props: TableProps) {
  return (
    <table>
      {/* Table implementation */}
    </table>
  );
}
```

4. **Modal Component**

```typescript
// _components/[Module]Modal.tsx
export function ModuleModal(props: ModalProps) {
  return (
    <div className="fixed inset-0 ...">
      {/* Modal implementation */}
    </div>
  );
}
```

### Phase 6: Refactor Main Page

#### File: `page.tsx`

```typescript
"use client";

import { useState } from "react";
import type { YourDataType } from "@/types";

// Hooks
import { use[Module], use[Module]Filters } from "./_hooks/use[Module]";

// Components
import { [Module]Stats } from "./_components/[Module]Stats";
import { [Module]Filters } from "./_components/[Module]Filters";
import { [Module]Table } from "./_components/[Module]Table";
import { [Module]Modal } from "./_components/[Module]Modal";

// API
import { updateItemApi, deleteItemApi } from "./_api/[module]Api";

export default function [Module]Page() {
  // Filter states
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Custom hooks
  const { data, setData, isLoading, error, setError, loadData } = use[Module]();
  const filtered = use[Module]Filters(data, { query, filter });
  const stats = use[Module]Stats(data);

  // Handlers
  async function handleUpdate(item, payload) {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateItemApi(item.id, payload);
      setData(current =>
        current.map(i => i.id === item.id ? updated : i)
      );
      setMessage("Đã cập nhật.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm("Xác nhận xóa?")) return;
    setIsSaving(true);
    try {
      await deleteItemApi(item.id);
      await loadData();
      setMessage("Đã xóa.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Module Name</h1>
      </div>

      {/* Alert */}
      {(error || message) && (
        <div className={error ? "error" : "success"}>
          {error || message}
        </div>
      )}

      {/* Stats */}
      <[Module]Stats {...stats} />

      {/* Filters */}
      <[Module]Filters
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
      />

      {/* Table */}
      <[Module]Table
        data={filtered}
        isLoading={isLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isSaving={isSaving}
      />

      {/* Modal */}
      {selectedItem && isModalOpen && (
        <[Module]Modal
          item={selectedItem}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUpdate}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
```

---

## ✅ Checklist cuối cùng

- [ ] Tất cả constants đã tách vào `_lib/constants.ts`
- [ ] Tất cả utils đã tách vào `_lib/*-utils.ts`
- [ ] Custom hooks đã tạo trong `_hooks/`
- [ ] API calls đã tách vào `_api/`
- [ ] Components lớn đã tách vào `_components/`
- [ ] File page.tsx < 300 dòng
- [ ] TypeScript không có lỗi
- [ ] Build thành công
- [ ] Test thủ công chức năng chính
- [ ] Backup file gốc (.old.tsx)
- [ ] Update documentation

---

## 🚨 Common Pitfalls

1. **Quên import types** - Luôn import types từ @/types
2. **Circular dependencies** - Tránh import qua lại giữa files
3. **Missing error handling** - Luôn có try-catch trong API calls
4. **Hardcoded values** - Move sang constants
5. **Inline styles** - Dùng Tailwind classes
6. **Large components** - Tách thành sub-components
7. **Duplicate logic** - Extract to utils/hooks

---

## 📏 Rules of Thumb

- 1 file ≤ 300 dòng
- 1 component = 1 responsibility
- 1 hook = 1 concern
- Constants > Magic numbers
- Types > Any
- Utils > Duplicates
- Comments khi cần

---

**Ready to refactor?** Start with Marketing module!
