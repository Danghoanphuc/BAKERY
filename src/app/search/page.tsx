import Link from "next/link";

export default function SearchPage() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tìm kiếm bánh</h1>
          <Link
            href="/"
            className="text-primary-500 hover:text-primary-600 transition-colors"
          >
            ← Về trang chủ
          </Link>
        </div>

        <div className="text-center py-12 text-neutral-500">
          <p>Trang tìm kiếm sẽ được phát triển trong giai đoạn tiếp theo.</p>
          <p className="mt-2 text-sm">
            SearchBar đã được tạo và có thể điều hướng đến trang này.
          </p>
        </div>
      </div>
    </main>
  );
}
