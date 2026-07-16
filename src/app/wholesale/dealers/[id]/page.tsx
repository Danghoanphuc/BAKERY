"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Trash2, Phone, MapPin, Building2, DollarSign, Calendar } from "lucide-react";
import type { Dealer } from "@/types";

export default function DealerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("regular");

  async function loadDealer() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/wholesale/dealers/${params.id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không thể tải thông tin đại lý");
      }

      const data = await response.json();
      setDealer(data);
      setSelectedTier(data.tier);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load dealer:", loadError);
      setError("Không thể tải dữ liệu đại lý.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDealer();
  }, [params.id]);

  async function handleApprove() {
    if (!dealer) return;

    setIsApproving(true);
    try {
      const response = await fetch(`/api/admin/wholesale/dealers/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          tier: selectedTier,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể phê duyệt đại lý");
      }

      loadDealer();
    } catch (error) {
      console.error("Failed to approve dealer:", error);
      setError("Không thể phê duyệt đại lý.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!dealer || !rejectionReason.trim()) return;

    setIsApproving(true);
    try {
      const response = await fetch(`/api/admin/wholesale/dealers/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: false,
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể từ chối đại lý");
      }

      setShowRejectModal(false);
      setRejectionReason("");
      loadDealer();
    } catch (error) {
      console.error("Failed to reject dealer:", error);
      setError("Không thể từ chối đại lý.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleDelete() {
    if (!dealer || !confirm("Bạn có chắc chắn muốn xóa đại lý này?")) return;

    try {
      const response = await fetch(`/api/admin/wholesale/dealers/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xóa đại lý");
      }

      router.push("/wholesale/dealers");
    } catch (error) {
      console.error("Failed to delete dealer:", error);
      setError("Không thể xóa đại lý.");
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approve: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Hoạt động",
      rejected: "Từ chối",
      suspended: "Đình chỉ",
    };
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const styles = {
      regular: "bg-gray-100 text-gray-800",
      silver: "bg-slate-100 text-slate-800",
      gold: "bg-amber-100 text-amber-800",
      platinum: "bg-purple-100 text-purple-800",
    };
    const labels = {
      regular: "Thường",
      silver: "Bạc",
      gold: "Vàng",
      platinum: "Bạch kim",
    };
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[tier as keyof typeof styles]}`}>
        {labels[tier as keyof typeof labels] || tier}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      retail: "Cửa hàng lẻ",
      restaurant: "Nhà hàng",
      cafe: "Quán cafe",
      other: "Khác",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPaymentTermsLabel = (terms: string) => {
    const labels = {
      cod: "COD (Thanh toán ngay)",
      net_7: "NET 7 (7 ngày)",
      next_order: "Đơn tiếp theo",
    };
    return labels[terms as keyof typeof labels] || terms;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-semibold text-[#7b6254]">Đang tải...</p>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-semibold text-[#7b6254]">Không tìm thấy đại lý</p>
      </div>
    );
  }

  const debtRatio = dealer.creditLimit > 0 ? (dealer.currentDebt / dealer.creditLimit) * 100 : 0;
  const debtStatus = debtRatio >= 100 ? "danger" : debtRatio >= 80 ? "warning" : "safe";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
            Wholesale CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">{dealer.name}</h1>
        </div>
        <div className="flex gap-2">
          {dealer.status === "pending" && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
                Từ chối
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isApproving ? "Đang duyệt..." : "Phê duyệt"}
              </button>
            </>
          )}
          {dealer.status === "approved" && (
            <button
              onClick={handleDelete}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Xóa
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
            <h2 className="text-lg font-bold text-[#3d2417]">Thông tin cơ bản</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Trạng thái</p>
                <p className="mt-1">{getStatusBadge(dealer.status)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Tier</p>
                <p className="mt-1">{getTierBadge(dealer.tier)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Loại hình</p>
                <p className="mt-1 text-sm text-[#3d2417]">{getTypeLabel(dealer.type)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Điều kiện thanh toán</p>
                <p className="mt-1 text-sm text-[#3d2417]">{getPaymentTermsLabel(dealer.paymentTerms)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#7b6254]" />
                <div>
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Số điện thoại</p>
                  <p className="mt-1 text-sm text-[#3d2417]">{dealer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#7b6254]" />
                <div>
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Email</p>
                  <p className="mt-1 text-sm text-[#3d2417]">{dealer.email || "N/A"}</p>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-[#7b6254]" />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Địa chỉ</p>
                  <p className="mt-1 text-sm text-[#3d2417]">
                    {dealer.address}, {dealer.district}, {dealer.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
            <h2 className="text-lg font-bold text-[#3d2417]">Thông tin kinh doanh</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Giấy phép kinh doanh</p>
                <p className="mt-1 text-sm text-[#3d2417]">{dealer.businessLicense || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Mã số thuế</p>
                <p className="mt-1 text-sm text-[#3d2417]">{dealer.taxId || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Người liên hệ</p>
                <p className="mt-1 text-sm text-[#3d2417]">{dealer.contactPerson || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Điện thoại người liên hệ</p>
                <p className="mt-1 text-sm text-[#3d2417]">{dealer.contactPhone || "N/A"}</p>
              </div>
            </div>
          </div>

          {dealer.notes && (
            <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
              <h2 className="text-lg font-bold text-[#3d2417]">Ghi chú</h2>
              <p className="mt-4 text-sm text-[#7b6254]">{dealer.notes}</p>
            </div>
          )}

          {dealer.rejectionReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-bold text-red-800">Lý do từ chối</h2>
              <p className="mt-4 text-sm text-red-700">{dealer.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
            <h2 className="text-lg font-bold text-[#3d2417]">Công nợ</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Nợ hiện tại</p>
                <p className="mt-1 text-2xl font-black text-[#3d2417]">
                  {formatCurrency(dealer.currentDebt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Hạn mức</p>
                <p className="mt-1 text-sm text-[#3d2417]">{formatCurrency(dealer.creditLimit)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Tỷ lệ nợ</p>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      debtStatus === "danger" ? "bg-red-500" : debtStatus === "warning" ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(debtRatio, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[#7b6254]">{debtRatio.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Chiết khấu</p>
                <p className="mt-1 text-sm text-[#3d2417]">{dealer.discountPercent}%</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/wholesale/dealers/${dealer.id}/debt`)}
              className="mt-4 w-full rounded-lg border border-[#f0e1d2] bg-[#fffaf6] px-4 py-2 text-sm font-semibold text-[#3d2417] transition hover:bg-[#f0e1d2]"
            >
              Xem chi tiết công nợ
            </button>
          </div>

          <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
            <h2 className="text-lg font-bold text-[#3d2417]">Thống kê</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#7b6254]" />
                <div>
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Tổng chi tiêu</p>
                  <p className="mt-1 text-sm font-semibold text-[#3d2417]">{formatCurrency(dealer.totalSpent)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#7b6254]" />
                <div>
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Tổng đơn hàng</p>
                  <p className="mt-1 text-sm font-semibold text-[#3d2417]">{dealer.totalOrders}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Đơn hàng gần nhất</p>
                <p className="mt-1 text-sm text-[#3d2417]">{formatDate(dealer.lastOrderAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#9b8171]">Ngày đăng ký</p>
                <p className="mt-1 text-sm text-[#3d2417]">{formatDate(dealer.createdAt)}</p>
              </div>
            </div>
          </div>

          {dealer.status === "pending" && (
            <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
              <h2 className="text-lg font-bold text-[#3d2417]">Phê duyệt</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#9b8171]">Chọn Tier</p>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                  >
                    <option value="regular">Thường (0% CK)</option>
                    <option value="silver">Bạc (0% CK)</option>
                    <option value="gold">Vàng (3% CK)</option>
                    <option value="platinum">Bạch kim (5% CK)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#3d2417]">Từ chối đại lý</h2>
            <p className="mt-2 text-sm text-[#7b6254]">
              Vui lòng nhập lý do từ chối đại lý này
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
              placeholder="Lý do từ chối..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="rounded-lg border border-[#f0e1d2] bg-white px-4 py-2 text-sm font-semibold text-[#7b6254] transition hover:bg-[#fffaf6]"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isApproving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isApproving ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
