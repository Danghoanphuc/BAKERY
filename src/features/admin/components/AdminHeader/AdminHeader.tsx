"use client";

import { Bell, LogOut, User } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Page Title - Will be dynamic later */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Quản lý hệ thống
        </h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {/* Badge for new notifications */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Admin Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-900">Admin User</p>
            <p className="text-xs text-neutral-500">admin@bakery.com</p>
          </div>

          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary-700" />
          </div>
        </div>

        {/* Logout Button */}
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
