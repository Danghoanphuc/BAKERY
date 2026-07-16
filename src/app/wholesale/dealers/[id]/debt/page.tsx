"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, RefreshCw, DollarSign, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function DealerDebtPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [dealer, setDealer] = useState<any>(null);
  const [debtRecords, setDebtRecords] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    try {
      setIsLoading(true);
      const [dealerResponse, debtResponse] = await Promise.all([
        fetch(`/api/admin/wholesale/dealers/${params.id}`, { cache: "no-store" }),
        fetch(`/api/admin/wholesale/dealers/${params.id}/debt`, { cache: "no-store" }),
      ]);

      if (!dealerResponse.ok || !debtResponse.ok) {
        throw new Error("Không thể tải dữ liệu");
      }

      setDealer(await dealerResponse.json());
      const debtData = await debtResponse.json();
      setDebtRecords(debtData.debtRecords || []);
      setPaymentRecords(debtData.paymentRecords || []);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load debt data:", loadError);
      setError("Không thể tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!dealer || !paymentAmount) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/wholesale/dealers/${params.id}/debt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          amount: parseInt(paymentAmount, 10),
          paymentMethod,
          reference: paymentReference || undefined,
          notes: paymentNotes || undefined,
          dealerName: dealer.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể ghi nhận thanh toán");
      }

      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");
      loadData();
    } catch (error) {
      console.error("Failed to record payment:", error);
      setError("Không thể ghi nhận thanh toán.");
    } finally {
      setIsSaving(false);
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
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">Công nợ - {dealer.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Ghi nhận thanh toán
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Debt Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#7b6254]" />
            <p className="text-sm font-semibold uppercase text-[#9b8171]">Nợ hiện tại</p>
          </div>
          <p className="mt-2 text-3xl font-black text-[#3d2417]">
            {formatCurrency(dealer.currentDebt)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#7b6254]" />
            <p className="text-sm font-semibold uppercase text-[#9b8171]">Hạn mức</p>
          </div>
          <p className="mt-2 text-3xl font-black text-[#3d2417]">
            {formatCurrency(dealer.creditLimit)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#7b6254]" />
            <p className="text-sm font-semibold uppercase text-[#9b8171]">Tỷ lệ nợ</p>
          </div>
          <p className="mt-2 text-3xl font-black text-[#3d2417]">
            {debtRatio.toFixed(1)}%
          </p>
          <div className="mt-2 h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${
                debtRatio >= 100 ? "bg-red-500" : debtRatio >= 80 ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(debtRatio, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Debt Records */}
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
        <h2 className="text-lg font-bold text-[#3d2417]">Lịch sử ghi nợ</h2>
        {debtRecords.length === 0 ? (
          <p className="mt-4 text-sm text-[#7b6254]">Chưa có ghi nợ nào</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#fffaf6]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Đơn hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Đã trả
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Còn lại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Hạn thanh toán
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e1d2]">
                {debtRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm text-[#3d2417]">{record.orderNumber}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#3d2417]">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">
                      {formatCurrency(record.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#3d2417]">
                      {formatCurrency(record.remainingAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#7b6254]">{formatDate(record.dueDate)}</td>
                    <td className="px-4 py-3">
                      {record.remainingAmount === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Đã trả
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          <XCircle className="h-3 w-3" />
                          Chưa trả
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Records */}
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-6">
        <h2 className="text-lg font-bold text-[#3d2417]">Lịch sử thanh toán</h2>
        {paymentRecords.length === 0 ? (
          <p className="mt-4 text-sm text-[#7b6254]">Chưa có thanh toán nào</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#fffaf6]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Ngày thanh toán
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Phương thức
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Mã tham chiếu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-[#7b6254]">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e1d2]">
                {paymentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm text-[#3d2417]">{formatDate(record.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#7b6254]">
                      {record.paymentMethod === "cash" ? "Tiền mặt" : record.paymentMethod === "bank_transfer" ? "Chuyển khoản" : "Khác"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#7b6254]">{record.reference || "-"}</td>
                    <td className="px-4 py-3 text-sm text-[#7b6254]">{record.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#3d2417]">Ghi nhận thanh toán</h2>
            <form onSubmit={handlePayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#3d2417]">
                  Số tiền thanh toán *
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                  placeholder="Nhập số tiền"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3d2417]">
                  Phương thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3d2417]">
                  Mã tham chiếu
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                  placeholder="Mã giao dịch (nếu có)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3d2417]">
                  Ghi chú
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                  placeholder="Ghi chú thêm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount("");
                    setPaymentReference("");
                    setPaymentNotes("");
                  }}
                  className="rounded-lg border border-[#f0e1d2] bg-white px-4 py-2 text-sm font-semibold text-[#7b6254] transition hover:bg-[#fffaf6]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? "Đang ghi nhận..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
