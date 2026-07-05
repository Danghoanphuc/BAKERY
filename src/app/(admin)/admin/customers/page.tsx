"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Gift,
  Link2,
  Mail,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { getAllOrders } from "@/lib/firebase";
import type { Customer, CustomerInput, LoyaltyTier, Order } from "@/types";

type CustomerWithMetrics = Customer & {
  orderCount: number;
  lifetimeValue: number;
  magicLinkUrl?: string;
};

type CustomerInvite = Customer & {
  magicLinkUrl?: string;
};

const emptyForm: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  status: "invited",
  loyaltyPoints: 0,
  tier: "new",
  personalization: {
    birthday: "",
    favoriteFlavors: [],
    favoriteProducts: [],
    dietaryNotes: "",
    defaultDeliveryAddress: "",
    specialOccasions: "",
    notes: "",
  },
};

const tierLabels: Record<LoyaltyTier, string> = {
  new: "Mới",
  silver: "Silver",
  gold: "Gold",
  vip: "VIP",
};

const statusLabels = {
  invited: "Đã tạo link",
  active: "Đang hoạt động",
  paused: "Tạm dừng",
};

const completedStatuses = new Set(["completed", "delivered"]);

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTags(value?: string[]) {
  return value?.join(", ") ?? "";
}

function getCustomerKey(customer: Pick<Customer, "email" | "phone">) {
  return customer.email?.trim().toLowerCase() || customer.phone.trim();
}

function getOrderKey(order: Pick<Order, "customerEmail" | "customerPhone">) {
  return (
    order.customerEmail?.trim().toLowerCase() || order.customerPhone.trim()
  );
}

function getTierByValue(value: number): LoyaltyTier {
  if (value >= 10000000) return "vip";
  if (value >= 5000000) return "gold";
  if (value >= 2000000) return "silver";
  return "new";
}

function getClientPublicBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (configured || origin).replace(/\/$/, "");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerInvite[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCustomerId, setCopiedCustomerId] = useState<string | null>(null);
  const [refreshingCustomerId, setRefreshingCustomerId] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState<CustomerInput>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [customersRes, firebaseOrders] = await Promise.all([
        fetch("/api/customers"),
        getAllOrders(),
      ]);

      if (!customersRes.ok) {
        throw new Error("Failed to load CRM data");
      }

      setCustomers(await customersRes.json());
      setOrders(firebaseOrders);
      setError(null);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setError("Không thể tải dữ liệu khách hàng");
    } finally {
      setIsLoading(false);
    }
  }

  const customersWithMetrics = useMemo<CustomerWithMetrics[]>(() => {
    return customers.map((customer) => {
      const customerKey = getCustomerKey(customer);
      const matchedOrders = orders.filter(
        (order) => getOrderKey(order) === customerKey,
      );
      const completedOrders = matchedOrders.filter((order) =>
        completedStatuses.has(order.status),
      );
      const lifetimeValue = completedOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      );
      const earnedPoints = Math.floor(lifetimeValue / 10000);

      return {
        ...customer,
        orderCount: matchedOrders.length,
        lifetimeValue,
        loyaltyPoints: Math.max(customer.loyaltyPoints, earnedPoints),
        tier:
          customer.tier === "new"
            ? getTierByValue(lifetimeValue)
            : customer.tier,
      };
    });
  }, [customers, orders]);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return customersWithMetrics;

    return customersWithMetrics.filter((customer) =>
      [customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [customersWithMetrics, query]);

  const stats = useMemo(() => {
    const totalPoints = customersWithMetrics.reduce(
      (sum, customer) => sum + customer.loyaltyPoints,
      0,
    );
    const activeCustomers = customersWithMetrics.filter(
      (customer) => customer.status === "active",
    ).length;
    const invitedCustomers = customersWithMetrics.filter(
      (customer) => customer.status === "invited",
    ).length;
    const vipCustomers = customersWithMetrics.filter(
      (customer) => customer.tier === "vip",
    ).length;

    return [
      {
        id: "customers",
        label: "Hồ sơ khách",
        value: customersWithMetrics.length.toString(),
        icon: Users,
      },
      {
        id: "active",
        label: "Đang hoạt động",
        value: activeCustomers.toString(),
        icon: Sparkles,
      },
      {
        id: "invited",
        label: "Link đã tạo",
        value: invitedCustomers.toString(),
        icon: Mail,
      },
      {
        id: "points",
        label: "Điểm tích lũy",
        value: totalPoints.toLocaleString("vi-VN"),
        icon: Gift,
      },
      {
        id: "vip",
        label: "Khách VIP",
        value: vipCustomers.toString(),
        icon: Star,
      },
    ];
  }, [customersWithMetrics]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const formatDate = (date?: Date | string) => {
    if (!date) return "Chưa có";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "Chưa có";

      return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(dateObj);
    } catch {
      return "Chưa có";
    }
  };

  const buildMagicUrl = (customer: CustomerInvite) => {
    if (customer.magicLinkUrl) return customer.magicLinkUrl;
    if (!customer.currentMagicLinkToken) return "";
    return `${getClientPublicBaseUrl()}/auth/magic?token=${customer.currentMagicLinkToken}`;
  };

  const registerUrl = `${getClientPublicBaseUrl()}/account/register`;

  const isMagicLinkExpired = (customer: Customer) => {
    if (!customer.magicLinkExpiresAt) return true;
    return new Date(customer.magicLinkExpiresAt).getTime() < Date.now();
  };

  const openAddModal = () => {
    setFormData({
      ...emptyForm,
      personalization: { ...emptyForm.personalization },
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setFormData({
      ...emptyForm,
      personalization: { ...emptyForm.personalization },
    });
  };

  const updatePersonalization = (
    key: keyof NonNullable<CustomerInput["personalization"]>,
    value: string | string[],
  ) => {
    setFormData((current) => ({
      ...current,
      personalization: {
        ...current.personalization,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create customer");
      }

      const customer = (await response.json()) as CustomerInvite;
      setCustomers((current) => [customer, ...current]);
      closeModal();
    } catch (err) {
      console.error("Failed to save customer:", err);
      setError("Không thể lưu khách hàng");
    } finally {
      setIsSaving(false);
    }
  };

  const refreshMagicLink = async (customer: Customer) => {
    setRefreshingCustomerId(customer.id);

    try {
      const response = await fetch(`/api/customers/${customer.id}/magic-link`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create magic link");
      }

      const data = await response.json();
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                currentMagicLinkToken: data.token,
                magicLinkExpiresAt: data.expiresAt,
                magicLinkUrl: data.magicLinkUrl,
                inviteSentAt: new Date(),
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Failed to refresh magic link:", err);
      setError("Không thể tạo lại magic link");
    } finally {
      setRefreshingCustomerId(null);
    }
  };

  const copyMagicLink = async (customer: Customer) => {
    const magicUrl = buildMagicUrl(customer);

    if (!magicUrl) {
      await refreshMagicLink(customer);
      return;
    }

    try {
      await navigator.clipboard.writeText(magicUrl);
      setCopiedCustomerId(customer.id);
      window.setTimeout(() => setCopiedCustomerId(null), 1800);
    } catch (err) {
      console.error("Failed to copy magic link:", err);
      setError("Không thể copy magic link");
    }
  };

  const getMailTo = (customer: CustomerInvite) => {
    const subject = encodeURIComponent("Magic link tài khoản Bakery của bạn");
    const body = encodeURIComponent(
      `Chào ${customer.name},\n\nBakery đã tạo tài khoản cho bạn. Link này chỉ dùng được một lần và sẽ hết hạn sau 30 phút:\n${buildMagicUrl(customer)}\n\nNhững lần sau bạn có thể đăng nhập nhanh bằng Zalo.`,
    );
    return `mailto:${customer.email ?? ""}?subject=${subject}&body=${body}`;
  };

  const getSmsHref = (customer: CustomerInvite) => {
    const body = encodeURIComponent(
      `Bakery da tao tai khoan cho ban. Bam link de kich hoat va dat mat khau: ${buildMagicUrl(customer)}`,
    );
    return `sms:${customer.phone}?&body=${body}`;
  };

  const getZaloHref = (customer: CustomerInvite) => {
    const text = encodeURIComponent(
      `Bakery da tao tai khoan cho ban. Bam link de kich hoat va dat mat khau: ${buildMagicUrl(customer)}`,
    );
    return `https://zalo.me/${customer.phone}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            CRM khách hàng
          </h1>
          <p className="mt-1 text-neutral-600">
            Tạo tài khoản, gửi magic link một lần, theo dõi điểm và cá nhân hóa
            chăm sóc
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={registerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <QrCode className="h-4 w-4" />
            QR đăng ký
          </a>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Tạo khách hàng
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            <QrCode className="h-4 w-4" />
            QR tự đăng ký
          </div>
          <h2 className="mt-3 text-lg font-bold text-neutral-950">
            Khách tự quét để tạo tài khoản
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Dùng tại quầy thu ngân: khách quét mã, nhập tên và số điện thoại,
            sau đó mở link kích hoạt để đặt mật khẩu.
          </p>
          <a
            href={registerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700"
          >
            {registerUrl}
          </a>
        </div>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(registerUrl)}`}
          alt="QR đăng ký tài khoản khách hàng"
          className="h-[140px] w-[140px] rounded-lg border border-neutral-200 bg-white p-2 sm:h-[180px] sm:w-[180px]"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="rounded-lg border border-neutral-200 bg-white p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-neutral-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, số điện thoại, email"
              className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Điểm / Hạng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Đơn hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Magic link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Cá nhân hóa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-neutral-500"
                  >
                    Đang tải CRM...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredCustomers.map((customer) => {
                  const expired = isMagicLinkExpired(customer);
                  return (
                    <tr key={customer.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">
                          {customer.name}
                        </div>
                        <div className="mt-1 text-sm text-neutral-500">
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-neutral-500">
                            {customer.email}
                          </div>
                        )}
                        {customer.zaloUserId && (
                          <div className="mt-1 text-xs text-[#0068ff]">
                            Đã liên kết Zalo
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {statusLabels[customer.status]}
                        </span>
                        <div className="mt-2 text-xs text-neutral-500">
                          Mời: {formatDate(customer.inviteSentAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-neutral-900">
                          {customer.loyaltyPoints.toLocaleString("vi-VN")} điểm
                        </div>
                        <div className="mt-1 text-sm text-neutral-500">
                          {tierLabels[customer.tier]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-900">
                          {customer.orderCount} đơn
                        </div>
                        <div className="mt-1 text-sm font-medium text-neutral-700">
                          {formatPrice(customer.lifetimeValue)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="mb-2 text-xs text-neutral-500">
                          {expired
                            ? "Đã hết hạn hoặc chưa có link"
                            : `Hết hạn: ${formatDate(customer.magicLinkExpiresAt)}`}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyMagicLink(customer)}
                            disabled={
                              !customer.currentMagicLinkToken || expired
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Copy className="h-4 w-4" />
                            {copiedCustomerId === customer.id
                              ? "Đã copy"
                              : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => refreshMagicLink(customer)}
                            disabled={refreshingCustomerId === customer.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCw className="h-4 w-4" />
                            {refreshingCustomerId === customer.id
                              ? "Đang tạo"
                              : "Tạo lại"}
                          </button>
                          {customer.email && !expired && (
                            <a
                              href={getMailTo(customer)}
                              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Mail className="h-4 w-4" />
                              Email
                            </a>
                          )}
                          {!expired && (
                            <>
                              <a
                                href={getSmsHref(customer)}
                                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                SMS
                              </a>
                              <a
                                href={getZaloHref(customer)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                              >
                                Zalo
                              </a>
                            </>
                          )}
                          {customer.currentMagicLinkToken && !expired && (
                            <Link
                              href={`/auth/magic?token=${customer.currentMagicLinkToken}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Link2 className="h-4 w-4" />
                              Mở
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        <div>
                          Vị yêu thích:{" "}
                          {joinTags(customer.personalization.favoriteFlavors) ||
                            "Chưa có"}
                        </div>
                        <div className="mt-1">
                          Ghi chú: {customer.personalization.notes || "Chưa có"}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-neutral-500"
                  >
                    Chưa có khách hàng phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Tạo khách hàng mới
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Họ tên *
                  </span>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Số điện thoại *
                  </span>
                  <input
                    required
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({ ...formData, phone: event.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData({ ...formData, email: event.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Sinh nhật
                  </span>
                  <input
                    type="date"
                    value={formData.personalization?.birthday ?? ""}
                    onChange={(event) =>
                      updatePersonalization("birthday", event.target.value)
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Vị yêu thích
                  </span>
                  <input
                    value={joinTags(formData.personalization?.favoriteFlavors)}
                    onChange={(event) =>
                      updatePersonalization(
                        "favoriteFlavors",
                        splitTags(event.target.value),
                      )
                    }
                    placeholder="Chocolate, matcha, tiramisu"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Sản phẩm hay mua
                  </span>
                  <input
                    value={joinTags(formData.personalization?.favoriteProducts)}
                    onChange={(event) =>
                      updatePersonalization(
                        "favoriteProducts",
                        splitTags(event.target.value),
                      )
                    }
                    placeholder="Red Velvet, Croissant"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Địa chỉ giao mặc định
                </span>
                <input
                  value={formData.personalization?.defaultDeliveryAddress ?? ""}
                  onChange={(event) =>
                    updatePersonalization(
                      "defaultDeliveryAddress",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Dị ứng / ăn kiêng
                  </span>
                  <textarea
                    rows={3}
                    value={formData.personalization?.dietaryNotes ?? ""}
                    onChange={(event) =>
                      updatePersonalization("dietaryNotes", event.target.value)
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Dịp đặc biệt
                  </span>
                  <textarea
                    rows={3}
                    value={formData.personalization?.specialOccasions ?? ""}
                    onChange={(event) =>
                      updatePersonalization(
                        "specialOccasions",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Ghi chú chăm sóc
                </span>
                <textarea
                  rows={3}
                  value={formData.personalization?.notes ?? ""}
                  onChange={(event) =>
                    updatePersonalization("notes", event.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Đang tạo..." : "Tạo và sinh magic link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
