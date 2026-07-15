"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Loader2,
  LocateFixed,
  MapPin,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Star,
  TicketPercent,
  Trash2,
} from "lucide-react";

import { AddressModal } from "@/components/layout/Header/AddressModal";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type {
  Customer,
  CustomerAddressBookEntry,
  OrderConfig,
} from "@/types";

type DeliveryAddress = NonNullable<OrderConfig["deliveryAddress"]>;

type AccountForm = {
  name: string;
  email: string;
  birthday: string;
  addressBook: CustomerAddressBookEntry[];
  favoriteFlavors: string;
  favoriteProducts: string;
  dietaryNotes: string;
  specialOccasions: string;
  notes: string;
  sweetnessLevel: "low" | "medium" | "high";
  favoriteCategories: string[];
  typicalPartySize: number;
  preferredBudget: "under_100k" | "100k_300k" | "over_300k";
};

const CATEGORY_PREFERENCES = ["Bánh kem", "Bánh ngọt", "Bánh mì", "Trà", "Cà phê", "Combo"];

type AccountDashboard = {
  rewards: {
    points: { current: number; neededForNextTier: number; progressPercent: number };
    journey: { currentTier: { name: string; benefit: string }; nextTier: { name: string } | null };
  };
  profile: { unlockedVoucherCount: number };
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: Array<{ productName: string; quantity: number }>;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAddressText(address?: CustomerAddressBookEntry) {
  if (!address) return "";
  return (
    address.formattedAddress ||
    [address.street, address.district, address.city].filter(Boolean).join(", ")
  );
}

function getDefaultAddress(addressBook: CustomerAddressBookEntry[]) {
  return addressBook.find((address) => address.isDefault) || addressBook[0];
}

function normalizeAddressBook(customer: Customer): CustomerAddressBookEntry[] {
  const saved = customer.personalization.addressBook ?? [];
  if (saved.length > 0) {
    const defaultIndex = saved.findIndex((address) => address.isDefault);
    return saved.map((address, index) => ({
      ...address,
      isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
    }));
  }

  const fallbackAddress = customer.personalization.defaultDeliveryAddress?.trim();
  if (!fallbackAddress) return [];

  return [
    {
      id: createId(),
      label: "Mặc định",
      street: fallbackAddress,
      district: "",
      city: "",
      formattedAddress: fallbackAddress,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function toForm(customer: Customer): AccountForm {
  return {
    name: customer.name,
    email: customer.email ?? "",
    birthday: customer.personalization.birthday ?? customer.birthday ?? "",
    addressBook: normalizeAddressBook(customer),
    favoriteFlavors: (customer.personalization.favoriteFlavors ?? []).join(", "),
    favoriteProducts: (customer.personalization.favoriteProducts ?? []).join(", "),
    dietaryNotes: customer.personalization.dietaryNotes ?? "",
    specialOccasions: customer.personalization.specialOccasions ?? "",
    notes: customer.personalization.notes ?? "",
    sweetnessLevel: customer.personalization.sweetnessLevel ?? "medium",
    favoriteCategories: customer.personalization.favoriteCategories ?? [],
    typicalPartySize: customer.personalization.typicalPartySize ?? 2,
    preferredBudget: customer.personalization.preferredBudget ?? "100k_300k",
  };
}

function toStoreAddress(address: CustomerAddressBookEntry): DeliveryAddress {
  return {
    street: address.street,
    district: address.district,
    city: address.city,
    lat: address.lat,
    lng: address.lng,
    formattedAddress: address.formattedAddress,
    placeId: address.placeId,
  };
}

function toAddressBookEntry(
  address: DeliveryAddress,
  current?: CustomerAddressBookEntry,
  index = 0,
): CustomerAddressBookEntry {
  const now = new Date().toISOString();
  return {
    id: current?.id || createId(),
    label: current?.label || (index === 0 ? "Nhà" : `Địa chỉ ${index + 1}`),
    street: address.street,
    district: address.district,
    city: address.city,
    formattedAddress:
      address.formattedAddress ||
      [address.street, address.district, address.city].filter(Boolean).join(", "),
    lat: address.lat,
    lng: address.lng,
    placeId: address.placeId,
    isDefault: current?.isDefault ?? index === 0,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

function ensureSingleDefault(addressBook: CustomerAddressBookEntry[]) {
  if (addressBook.length === 0) return [];
  const defaultIndex = addressBook.findIndex((address) => address.isDefault);

  return addressBook.map((address, index) => ({
    ...address,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
}

export default function AccountPage() {
  const { setDeliveryAddress } = useOrderConfigStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AccountDashboard | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const defaultAddressText = useMemo(
    () => getAddressText(getDefaultAddress(form?.addressBook ?? [])),
    [form?.addressBook],
  );
  const isDirty = useMemo(
    () => Boolean(customer && form && JSON.stringify(form) !== JSON.stringify(toForm(customer))),
    [customer, form],
  );
  const profileCompletion = useMemo(() => {
    if (!form) return 0;
    const completed = [form.name, form.email, form.birthday, form.addressBook.length > 0, form.favoriteCategories.length > 0, form.dietaryNotes].filter(Boolean).length;
    return Math.round((completed / 6) * 100);
  }, [form]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    async function loadAccount() {
      try {
        const [response, profileResponse, ordersResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
        ]);

        if (!response.ok) {
          window.location.href = "/account/login?next=/account";
          return;
        }

        const data = await response.json();
        const nextCustomer = data.customer as Customer;
        const nextForm = toForm(nextCustomer);
        const defaultAddress = getDefaultAddress(nextForm.addressBook);

        setCustomer(nextCustomer);
        setForm(nextForm);
        if (profileResponse.ok) setDashboard(await profileResponse.json());
        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          setRecentOrders(Array.isArray(orders) ? orders.slice(0, 3) : []);
        }

        if (defaultAddress) {
          setDeliveryAddress(toStoreAddress(defaultAddress));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();
  }, [setDeliveryAddress]);

  function openAddressModal(address?: CustomerAddressBookEntry) {
    setMessage(null);
    setError(null);
    setEditingAddressId(address?.id ?? null);
    setDeliveryAddress(address ? toStoreAddress(address) : undefined);
    setIsAddressModalOpen(true);
  }

  function handleAddressConfirm(address: DeliveryAddress) {
    if (!form) return;

    setForm((current) => {
      if (!current) return current;

      const editingIndex = current.addressBook.findIndex(
        (item) => item.id === editingAddressId,
      );
      const nextEntry = toAddressBookEntry(
        address,
        editingIndex >= 0 ? current.addressBook[editingIndex] : undefined,
        current.addressBook.length,
      );

      const nextAddressBook =
        editingIndex >= 0
          ? current.addressBook.map((item, index) =>
              index === editingIndex ? nextEntry : item,
            )
          : [...current.addressBook, nextEntry];

      return {
        ...current,
        addressBook: ensureSingleDefault(nextAddressBook),
      };
    });
  }

  function setDefaultAddress(id: string) {
    if (!form) return;

    const nextAddressBook = form.addressBook.map((address) => ({
      ...address,
      isDefault: address.id === id,
      updatedAt: address.id === id ? new Date().toISOString() : address.updatedAt,
    }));
    const defaultAddress = nextAddressBook.find((address) => address.id === id);

    setForm({ ...form, addressBook: nextAddressBook });
    if (defaultAddress) setDeliveryAddress(toStoreAddress(defaultAddress));
  }

  function removeAddress(id: string) {
    if (!form) return;

    const nextAddressBook = ensureSingleDefault(
      form.addressBook.filter((address) => address.id !== id),
    );
    setForm({ ...form, addressBook: nextAddressBook });

    const defaultAddress = getDefaultAddress(nextAddressBook);
    setDeliveryAddress(defaultAddress ? toStoreAddress(defaultAddress) : undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || !form) return;

    const addressBook = ensureSingleDefault(form.addressBook);
    const defaultDeliveryAddress = getAddressText(getDefaultAddress(addressBook));

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const personalization = {
        birthday: form.birthday || undefined,
        defaultDeliveryAddress: defaultDeliveryAddress || undefined,
        addressBook,
        favoriteFlavors: splitTags(form.favoriteFlavors),
        favoriteProducts: splitTags(form.favoriteProducts),
        dietaryNotes: form.dietaryNotes || undefined,
        specialOccasions: form.specialOccasions || undefined,
        notes: form.notes || undefined,
        sweetnessLevel: form.sweetnessLevel,
        favoriteCategories: form.favoriteCategories,
        typicalPartySize: form.typicalPartySize,
        preferredBudget: form.preferredBudget,
        orderNotifications: customer.personalization.orderNotifications ?? true,
        marketingConsent: customer.personalization.marketingConsent ?? false,
        consentUpdatedAt: customer.personalization.consentUpdatedAt,
      };

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          personalization,
        }),
      });

      if (!response.ok) throw new Error("save_failed");

      const updatedCustomer: Customer = {
        ...customer,
        name: form.name,
        email: form.email || undefined,
        personalization: {
          ...customer.personalization,
          ...personalization,
        },
      };

      setCustomer(updatedCustomer);
      setForm(toForm(updatedCustomer));
      setMessage("Đã cập nhật hồ sơ của bạn.");
    } catch (err) {
      console.error("Failed to update account:", err);
      setError("Chưa lưu được hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !form || !customer) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 text-[#7a4b31]">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang mở tài khoản...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-28 text-[#3b170c]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#7a4b31] shadow-sm"
            aria-label="Quay lại hồ sơ"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-right">
            <h1 className="text-[22px] font-black">Tài khoản</h1>
            <p className="text-[12px] font-semibold text-[#8b6a58]">
              {customer.zaloUserId ? "Đã liên kết Zalo" : "Chưa liên kết Zalo"}
            </p>
          </div>
        </div>

        <section className="mt-5 rounded-[18px] border border-white bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#8a4a28] text-lg font-black uppercase text-white">
              {customer.name
                .trim()
                .split(/\s+/)
                .slice(-2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black">{customer.name}</p>
              <p className="text-[13px] font-semibold text-[#7b6a60]">
                {customer.phone}
              </p>
            </div>
            <ShieldCheck
              className={`h-6 w-6 ${
                customer.phoneVerifiedAt ? "text-[#34802f]" : "text-[#b69a89]"
              }`}
            />
          </div>
          <div className="mt-4 rounded-[14px] bg-[#fffaf6] p-3">
            <p
              className={`text-[13px] font-black ${
                customer.phoneVerifiedAt ? "text-[#34802f]" : "text-[#a05a2c]"
              }`}
            >
              {customer.phoneVerifiedAt
                ? "Số điện thoại đã được xác nhận"
                : "Số điện thoại chưa xác nhận"}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#7b6a60]">
              {customer.phoneVerifiedAt
                ? "Số này đã được nhân viên xác nhận trong quá trình chăm sóc đơn hàng."
                : "Tiệm sẽ xác nhận số điện thoại khi gọi chăm sóc hoặc đơn hàng cần kiểm tra."}
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[16px] border border-[#f0ddce] bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between text-[12px] font-black"><span>Hồ sơ hoàn thiện</span><span className="text-[#b84a39]">{profileCompletion}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f4e6dc]"><div className="h-full rounded-full bg-[#b84a39]" style={{ width: `${profileCompletion}%` }} /></div>
          {profileCompletion < 100 && <p className="mt-2 text-[11px] font-semibold text-[#8b6a58]">Bổ sung email, ngày sinh, địa chỉ và sở thích để nhận gợi ý chính xác hơn.</p>}
        </section>

        {dashboard && (
          <section className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#fff0d8,#ffe1dc)] p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-[#8b6a58]">Hạng thành viên</p>
                <h2 className="text-[20px] font-black text-[#8a4a28]">{dashboard.rewards.journey.currentTier.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-black text-[#b84a39]">{dashboard.rewards.points.current.toLocaleString("vi-VN")}</p>
                <p className="text-[11px] font-bold text-[#8b6a58]">điểm hiện có</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-[#b84a39]" style={{ width: `${dashboard.rewards.points.progressPercent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/rewards" className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white text-[12px] font-black text-[#7a4b31]">
                <Star className="h-4 w-4" /> Xem quyền lợi
              </Link>
              <Link href="/account/rewards" className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#b84a39] text-[12px] font-black text-white">
                <TicketPercent className="h-4 w-4" /> {dashboard.profile.unlockedVoucherCount} voucher
              </Link>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-black">Đơn hàng gần đây</h2>
              <p className="text-[12px] font-semibold text-[#8b6a58]">Theo dõi trạng thái hoặc mua lại món quen.</p>
            </div>
            <Link href="/order" className="inline-flex items-center text-[12px] font-black text-[#b84a39]">Xem tất cả <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentOrders.length ? recentOrders.map((order) => (
              <Link key={order.id} href="/order" className="flex items-center gap-3 rounded-[13px] border border-[#f0e1d2] bg-[#fffaf6] p-3">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-white text-[#a44c36]"><PackageCheck className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black">#{order.orderNumber}</span>
                  <span className="block truncate text-[11px] font-semibold text-[#8b6a58]">{order.items?.map((item) => item.productName).join(", ") || "Đơn bánh"}</span>
                </span>
                <span className="text-right text-[12px] font-black text-[#7a4b31]">{order.totalAmount.toLocaleString("vi-VN")}₫</span>
              </Link>
            )) : (
              <div className="rounded-[13px] border border-dashed border-[#e4cdbc] p-4 text-center text-[12px] font-semibold text-[#8b6a58]">Bạn chưa có đơn hàng nào.</div>
            )}
          </div>
        </section>

        <Link
          href="/account/password"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#edd8ca] bg-white text-[14px] font-black text-[#7a4b31] shadow-sm"
        >
          <KeyRound className="h-4 w-4" />
          Đổi mã PIN
        </Link>

        <Link
          href="/account/security/sessions"
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#edd8ca] bg-white text-[14px] font-black text-[#7a4b31] shadow-sm"
        >
          <Smartphone className="h-4 w-4" />
          Thiết bị đăng nhập
        </Link>

        <Link
          href="/account/security/passkeys"
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#edd8ca] bg-white text-[14px] font-black text-[#7a4b31] shadow-sm"
        >
          <Fingerprint className="h-4 w-4" />
          Passkey và sinh trắc học
        </Link>

        <Link
          href="/account/preferences"
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#edd8ca] bg-white text-[14px] font-black text-[#7a4b31] shadow-sm"
        >
          <ShieldCheck className="h-4 w-4" />
          Thông báo & quyền riêng tư
        </Link>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <h2 className="text-[16px] font-black">Thông tin cơ bản</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-[12px] font-black text-[#7b4b34]">Độ ngọt yêu thích</span>
                <select value={form.sweetnessLevel} onChange={(event) => setForm({ ...form, sweetnessLevel: event.target.value as AccountForm["sweetnessLevel"] })} className="mt-1 h-11 w-full rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 text-[14px] font-semibold">
                  <option value="low">Ít ngọt</option>
                  <option value="medium">Vừa ngọt</option>
                  <option value="high">Ngọt đậm</option>
                </select>
              </label>
              <div>
                <span className="text-[12px] font-black text-[#7b4b34]">Danh mục yêu thích</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORY_PREFERENCES.map((category) => {
                    const selected = form.favoriteCategories.includes(category);
                    return (
                      <button key={category} type="button" onClick={() => setForm({ ...form, favoriteCategories: selected ? form.favoriteCategories.filter((item) => item !== category) : [...form.favoriteCategories, category] })} className={`rounded-full px-3 py-2 text-[12px] font-black ${selected ? "bg-[#b84a39] text-white" : "bg-[#fffaf6] text-[#7a4b31] ring-1 ring-[#edd8ca]"}`}>
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[12px] font-black text-[#7b4b34]">Số người thường dùng</span>
                  <input type="number" min={1} max={100} value={form.typicalPartySize} onChange={(event) => setForm({ ...form, typicalPartySize: Number(event.target.value) || 1 })} className="mt-1 h-11 w-full rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 text-[14px] font-semibold" />
                </label>
                <label className="block">
                  <span className="text-[12px] font-black text-[#7b4b34]">Khoảng giá</span>
                  <select value={form.preferredBudget} onChange={(event) => setForm({ ...form, preferredBudget: event.target.value as AccountForm["preferredBudget"] })} className="mt-1 h-11 w-full rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-2 text-[13px] font-semibold">
                    <option value="under_100k">Dưới 100k</option>
                    <option value="100k_300k">100k–300k</option>
                    <option value="over_300k">Trên 300k</option>
                  </select>
                </label>
              </div>
              <Field
                label="Tên khách hàng"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
              <Field
                label="Ngày sinh"
                type="date"
                value={form.birthday}
                onChange={(value) => setForm({ ...form, birthday: value })}
              />
            </div>
          </section>

          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-black">Sổ địa chỉ</h2>
                <p className="mt-1 text-[12px] font-semibold text-[#8b6a58]">
                  {defaultAddressText || "Chọn địa chỉ mặc định để đặt bánh nhanh hơn."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAddressModal()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#3d2417] px-3 text-[12px] font-black text-white"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {form.addressBook.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openAddressModal()}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-dashed border-[#d8bda9] bg-[#fffaf6] p-3 text-left"
                >
                  <MapPin className="h-5 w-5 shrink-0 text-[#b84a39]" />
                  <span>
                    <span className="block text-[13px] font-black">
                      Chưa có địa chỉ giao bánh
                    </span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-[#8b6a58]">
                      Ghim vị trí để tiệm giao đúng nơi.
                    </span>
                  </span>
                </button>
              ) : (
                form.addressBook.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    onEdit={() => openAddressModal(address)}
                    onDefault={() => setDefaultAddress(address.id)}
                    onRemove={() => removeAddress(address.id)}
                    onMetadata={(patch) => setForm({
                      ...form,
                      addressBook: form.addressBook.map((item) => item.id === address.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item),
                    })}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <h2 className="text-[16px] font-black">Cá nhân hóa</h2>
            <div className="mt-3 space-y-3">
              <Field
                label="Vị bánh yêu thích"
                value={form.favoriteFlavors}
                onChange={(value) => setForm({ ...form, favoriteFlavors: value })}
                placeholder="Ví dụ: chocolate, matcha, dâu"
              />
              <Field
                label="Món thường mua"
                value={form.favoriteProducts}
                onChange={(value) => setForm({ ...form, favoriteProducts: value })}
                placeholder="Ví dụ: tiramisu, croissant"
              />
              <TextArea
                label="Ghi chú ăn uống"
                value={form.dietaryNotes}
                onChange={(value) => setForm({ ...form, dietaryNotes: value })}
              />
              <TextArea
                label="Dịp đặc biệt"
                value={form.specialOccasions}
                onChange={(value) => setForm({ ...form, specialOccasions: value })}
              />
              <TextArea
                label="Ghi chú khác"
                value={form.notes}
                onChange={(value) => setForm({ ...form, notes: value })}
              />
            </div>
          </section>

          {message && (
            <p className="rounded-[12px] bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-[12px] bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(184,74,57,0.22)] disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Lưu hồ sơ
          </button>
        </form>
      </div>

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onConfirm={handleAddressConfirm}
      />
    </main>
  );
}

function AddressCard({
  address,
  onEdit,
  onDefault,
  onRemove,
  onMetadata,
}: {
  address: CustomerAddressBookEntry;
  onEdit: () => void;
  onDefault: () => void;
  onRemove: () => void;
  onMetadata: (patch: Partial<CustomerAddressBookEntry>) => void;
}) {
  return (
    <div className="rounded-[14px] border border-[#edd8ca] bg-[#fffaf6] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#b84a39] ring-1 ring-[#f0d8ca]">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-black text-[#3b170c]">
              {address.label}
            </p>
            {address.isDefault && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black text-green-700 ring-1 ring-green-100">
                Mặc định
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7b6a60]">
            {getAddressText(address)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <input value={address.recipientName ?? ""} onChange={(event) => onMetadata({ recipientName: event.target.value })} placeholder="Tên người nhận" className="h-9 rounded-[10px] border border-[#edd8ca] bg-white px-2 text-[12px] font-semibold" />
        <input value={address.recipientPhone ?? ""} onChange={(event) => onMetadata({ recipientPhone: event.target.value })} placeholder="SĐT người nhận" className="h-9 rounded-[10px] border border-[#edd8ca] bg-white px-2 text-[12px] font-semibold" />
        <input value={address.note ?? ""} onChange={(event) => onMetadata({ note: event.target.value })} placeholder="Ghi chú giao hàng" className="col-span-2 h-9 rounded-[10px] border border-[#edd8ca] bg-white px-2 text-[12px] font-semibold" />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[11px] bg-white px-3 text-[12px] font-black text-[#7a4b31] ring-1 ring-[#edd8ca]"
        >
          <LocateFixed className="h-4 w-4" />
          Ghim lại
        </button>
        <button
          type="button"
          onClick={onDefault}
          disabled={address.isDefault}
          aria-label="Đặt làm mặc định"
          className="grid h-9 w-9 place-items-center rounded-[11px] bg-white text-[#2f7b35] ring-1 ring-[#d9ead6] disabled:opacity-45"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Xóa địa chỉ"
          className="grid h-9 w-9 place-items-center rounded-[11px] bg-white text-[#b64b40] ring-1 ring-[#f0d0cc]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#7b4b34]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 text-[14px] font-semibold outline-none focus:border-[#b84a39]"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#7b4b34]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 py-2 text-[14px] font-semibold outline-none focus:border-[#b84a39]"
      />
    </label>
  );
}
