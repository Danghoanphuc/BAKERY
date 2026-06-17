"use client";

import { Megaphone, Plus } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Khuyến mãi & Marketing
          </h1>
          <p className="text-neutral-600 mt-1">
            Quản lý các chương trình khuyến mãi và marketing
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          Tạo khuyến mãi mới
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-lg border border-neutral-200 p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Chức năng đang phát triển
          </h3>
          <p className="text-neutral-600 mb-6">
            Module quản lý khuyến mãi và marketing sẽ sớm được bổ sung
          </p>
          <button className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors">
            Quay lại Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
