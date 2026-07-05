"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type {
  MarketingDiscountType,
  VoucherAudience,
  VoucherBudgetMode,
  VoucherIssueMethod,
  VoucherUseChannel,
} from "@/types";
import {
  audienceLabels,
  buildVoucherCampaignPayload,
  channelLabels,
  defaultVoucherDraft,
  discountTypeLabels,
  formatCurrency,
  formatNumber,
  getDiscountPreview,
  getIssuedLimitFromBudget,
  getMaxPromotionBudget,
  issueMethodLabels,
  voucherGoalPresets,
  voucherSteps,
  type VoucherDraft,
} from "../_lib/voucher-admin";

const previewSubtotal = 100000;

export default function NewVoucherCampaignPage() {
  const [draft, setDraft] = useState<VoucherDraft>(defaultVoucherDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = voucherSteps[stepIndex]?.id ?? "goal";
  const preview = useMemo(
    () => getDiscountPreview(previewSubtotal, draft),
    [draft],
  );
  const maxBudget = useMemo(() => getMaxPromotionBudget(draft), [draft]);
  const issuedFromBudget = useMemo(
    () => getIssuedLimitFromBudget(draft),
    [draft],
  );

  function updateDraft(patch: Partial<VoucherDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function goNext() {
    setStepIndex((current) => Math.min(current + 1, voucherSteps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function saveVoucher(status: "draft" | "active") {
    setIsSaving(true);
    setError(null);

    try {
      const payload = buildVoucherCampaignPayload({ ...draft, status });
      const response = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("save_failed");
      window.location.href = "/admin/vouchers";
    } catch (err) {
      console.error("Failed to create voucher:", err);
      setError("Chưa tạo được chương trình voucher. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/vouchers"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách voucher
          </Link>
          <h1 className="text-2xl font-bold text-neutral-950">
            Tạo chương trình ưu đãi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Đi theo từng bước: mục tiêu, ưu đãi, ngân sách, điều kiện, đối tượng,
            kênh dùng và xem lại trước khi phát hành.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <WizardProgress stepIndex={stepIndex} />

          <div className="p-5">
            {step === "goal" && (
              <GoalStep draft={draft} updateDraft={updateDraft} />
            )}
            {step === "discount" && (
              <DiscountStep draft={draft} updateDraft={updateDraft} />
            )}
            {step === "budget" && (
              <BudgetStep
                draft={draft}
                updateDraft={updateDraft}
                maxBudget={maxBudget}
                issuedFromBudget={issuedFromBudget}
              />
            )}
            {step === "rules" && (
              <RulesStep draft={draft} updateDraft={updateDraft} />
            )}
            {step === "audience" && (
              <AudienceStep draft={draft} updateDraft={updateDraft} />
            )}
            {step === "channels" && (
              <ChannelsStep draft={draft} updateDraft={updateDraft} />
            )}
            {step === "review" && (
              <ReviewStep
                draft={draft}
                maxBudget={maxBudget}
                onSaveDraft={() => saveVoucher("draft")}
                onPublish={() => saveVoucher("active")}
                isSaving={isSaving}
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại
            </button>

            {step !== "review" ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Tiếp tục
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-sm font-semibold text-neutral-500">
                Kiểm tra lại rồi lưu nháp hoặc phát hành.
              </span>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <LivePreview draft={draft} preview={preview} maxBudget={maxBudget} />
        </aside>
      </div>
    </div>
  );
}

function WizardProgress({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="border-b border-neutral-200 px-5 py-4">
      <div className="grid gap-2 md:grid-cols-7">
        {voucherSteps.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${
              index === stepIndex
                ? "bg-neutral-950 text-white"
                : index < stepIndex
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-neutral-50 text-neutral-500"
            }`}
          >
            <span className="mr-1">{index + 1}.</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalStep({
  draft,
  updateDraft,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
}) {
  return (
    <StepShell
      title="Chương trình này dùng để làm gì?"
      description="Chọn mục tiêu trước, hệ thống sẽ gợi ý cấu hình phù hợp."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {voucherGoalPresets.map((preset) => (
          <ChoiceCard
            key={preset.id}
            title={preset.title}
            description={preset.description}
            active={draft.programGoal === preset.id}
            onClick={() =>
              updateDraft({
                ...preset.draft,
                programGoal: preset.id,
              })
            }
          />
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field
          label="Tên chương trình"
          value={draft.name}
          onChange={(name) => updateDraft({ name })}
        />
        <Field
          label="Mã voucher / prefix mã"
          value={draft.code}
          onChange={(code) => updateDraft({ code: String(code).toUpperCase() })}
        />
        <TextArea
          label="Mô tả nội bộ"
          value={draft.internalDescription}
          onChange={(internalDescription) => updateDraft({ internalDescription })}
        />
        <TextArea
          label="Mô tả hiển thị cho khách"
          value={draft.customerDescription}
          onChange={(customerDescription) =>
            updateDraft({ customerDescription })
          }
        />
      </div>
    </StepShell>
  );
}

function DiscountStep({
  draft,
  updateDraft,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
}) {
  const types: MarketingDiscountType[] = [
    "amount",
    "percent",
    "gift_item",
    "free_shipping",
    "buy_x_get_y",
  ];

  return (
    <StepShell
      title="Ưu đãi này giảm kiểu gì?"
      description="Nếu giảm theo phần trăm, nên luôn có mức giảm tối đa để kiểm soát rủi ro."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {types.map((type) => (
          <ChoiceCard
            key={type}
            title={discountTypeLabels[type]}
            description={getDiscountTypeHint(type)}
            active={draft.discountType === type}
            onClick={() => updateDraft({ discountType: type })}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field
          label="Mức giảm"
          type="number"
          value={draft.discountValue}
          onChange={(discountValue) => updateDraft({ discountValue })}
          suffix={draft.discountType === "percent" ? "%" : "đ"}
        />
        <Field
          label="Giảm tối đa"
          type="number"
          value={draft.maxDiscountAmount}
          onChange={(maxDiscountAmount) => updateDraft({ maxDiscountAmount })}
          suffix="đ"
        />
        <Field
          label="Đơn tối thiểu"
          type="number"
          value={draft.minOrderValue}
          onChange={(minOrderValue) => updateDraft({ minOrderValue })}
          suffix="đ"
        />
      </div>
    </StepShell>
  );
}

function BudgetStep({
  draft,
  updateDraft,
  maxBudget,
  issuedFromBudget,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
  maxBudget: number;
  issuedFromBudget: number;
}) {
  const modes: Array<{
    id: VoucherBudgetMode;
    title: string;
    description: string;
  }> = [
    {
      id: "quantity",
      title: "Tôi biết muốn phát bao nhiêu mã",
      description: "Nhập số lượng, hệ thống tính ngân sách tối đa.",
    },
    {
      id: "budget",
      title: "Tôi biết ngân sách tối đa",
      description: "Nhập ngân sách, hệ thống tính số mã có thể phát.",
    },
    {
      id: "both",
      title: "Giới hạn cả hai",
      description: "Khuyến nghị để kiểm soát chặt chương trình.",
    },
  ];

  return (
    <StepShell
      title="Ngân sách & số lượng phát hành"
      description="Xem voucher như tiền tệ: mỗi mã có giá trị và cần giới hạn ngân sách."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {modes.map((mode) => (
          <ChoiceCard
            key={mode.id}
            title={mode.title}
            description={mode.description}
            active={draft.budgetMode === mode.id}
            onClick={() => updateDraft({ budgetMode: mode.id })}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field
          label="Số lượng voucher"
          type="number"
          value={draft.issuedLimit}
          onChange={(issuedLimit) => updateDraft({ issuedLimit })}
        />
        <Field
          label="Ngân sách tối đa"
          type="number"
          value={draft.maxBudget}
          onChange={(maxBudget) => updateDraft({ maxBudget })}
          suffix="đ"
        />
        <ReadOnlyBox
          label={
            draft.budgetMode === "budget"
              ? "Có thể phát tối đa"
              : "Ngân sách khuyến mãi tối đa"
          }
          value={
            draft.budgetMode === "budget"
              ? `${formatNumber(issuedFromBudget)} voucher`
              : formatCurrency(maxBudget)
          }
        />
      </div>
    </StepShell>
  );
}

function RulesStep({
  draft,
  updateDraft,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
}) {
  return (
    <StepShell
      title="Điều kiện sử dụng cơ bản"
      description="MVP chỉ hiển thị điều kiện quan trọng. Điều kiện nâng cao sẽ được gom lại sau."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Field
          label="Đơn tối thiểu"
          type="number"
          value={draft.minOrderValue}
          onChange={(minOrderValue) => updateDraft({ minOrderValue })}
          suffix="đ"
        />
        <Field
          label="Hạn dùng sau khi nhận"
          type="number"
          value={draft.validDaysAfterIssue}
          onChange={(validDaysAfterIssue) =>
            updateDraft({ validDaysAfterIssue })
          }
          suffix="ngày"
        />
        <Field
          label="Mỗi khách dùng"
          type="number"
          value={draft.maxUsesPerCustomer}
          onChange={(maxUsesPerCustomer) =>
            updateDraft({ maxUsesPerCustomer })
          }
          suffix="lần"
        />
        <ToggleCard
          title="Dùng chung voucher khác"
          checked={draft.stackable}
          onChange={(stackable) => updateDraft({ stackable })}
        />
      </div>
    </StepShell>
  );
}

function AudienceStep({
  draft,
  updateDraft,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
}) {
  const audiences: VoucherAudience[] = [
    "all",
    "new_customers",
    "existing_customers",
    "inactive_customers",
    "birthday_customers",
    "specific_customers",
  ];

  return (
    <StepShell
      title="Voucher này dành cho ai?"
      description="Dùng ngôn ngữ đời thường, hệ thống tự hiểu logic phía sau."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {audiences.map((audience) => (
          <ChoiceCard
            key={audience}
            title={audienceLabels[audience]}
            description={getAudienceHint(audience)}
            active={draft.audienceType === audience}
            onClick={() => updateDraft({ audienceType: audience })}
          />
        ))}
      </div>
    </StepShell>
  );
}

function ChannelsStep({
  draft,
  updateDraft,
}: {
  draft: VoucherDraft;
  updateDraft: (patch: Partial<VoucherDraft>) => void;
}) {
  const channels: VoucherUseChannel[] = [
    "pos_pickup_now",
    "web_pickup_later",
    "web_delivery",
  ];
  const issueMethods: VoucherIssueMethod[] = [
    "public",
    "auto_after_order",
    "manual_phone",
    "print",
  ];

  return (
    <StepShell
      title="Dùng ở đâu và phát bằng cách nào?"
      description="Tạo campaign là một việc, phát voucher cho khách là một việc khác."
    >
      <h3 className="text-sm font-bold text-neutral-900">Kênh sử dụng</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {channels.map((channel) => (
          <ToggleChoice
            key={channel}
            title={channelLabels[channel]}
            checked={draft.channels.includes(channel)}
            onChange={(checked) =>
              updateDraft({
                channels: checked
                  ? [...draft.channels, channel]
                  : draft.channels.filter((item) => item !== channel),
              })
            }
          />
        ))}
      </div>

      <h3 className="mt-6 text-sm font-bold text-neutral-900">Cách phát</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {issueMethods.map((method) => (
          <ToggleChoice
            key={method}
            title={issueMethodLabels[method]}
            checked={draft.issueMethods.includes(method)}
            onChange={(checked) =>
              updateDraft({
                issueMethods: checked
                  ? [...draft.issueMethods, method]
                  : draft.issueMethods.filter((item) => item !== method),
              })
            }
          />
        ))}
      </div>
    </StepShell>
  );
}

function ReviewStep({
  draft,
  maxBudget,
  onSaveDraft,
  onPublish,
  isSaving,
}: {
  draft: VoucherDraft;
  maxBudget: number;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving: boolean;
}) {
  return (
    <StepShell
      title="Xem lại trước khi phát hành"
      description="Tóm tắt bằng ngôn ngữ dễ hiểu trước khi voucher có giá trị thật."
    >
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <ReviewLine label="Chương trình" value={draft.name} />
        <ReviewLine
          label="Khách được hưởng"
          value={`${discountTypeLabels[draft.discountType]} ${formatDiscountValue(draft)} cho đơn từ ${formatCurrency(draft.minOrderValue)}.`}
        />
        <ReviewLine
          label="Ai được dùng"
          value={`${audienceLabels[draft.audienceType]}, mỗi số điện thoại dùng ${draft.maxUsesPerCustomer} lần.`}
        />
        <ReviewLine
          label="Dùng ở"
          value={draft.channels.map((channel) => channelLabels[channel]).join(", ")}
        />
        <ReviewLine
          label="Thời hạn"
          value={`${draft.validDaysAfterIssue} ngày sau khi nhận.`}
        />
        <ReviewLine
          label="Số lượng"
          value={`Tối đa ${formatNumber(draft.issuedLimit)} voucher.`}
        />
        <ReviewLine
          label="Ngân sách tối đa"
          value={formatCurrency(maxBudget)}
        />
        <ReviewLine
          label="Lưu ý"
          value={
            draft.stackable
              ? "Voucher có thể dùng chung với mã khác."
              : "Voucher không dùng chung với mã khác."
          }
        />
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Sau khi phát hành và có khách nhận voucher, các thay đổi quan trọng như
        mức giảm, ngân sách và điều kiện sử dụng nên được ghi log.
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Phát hành
        </button>
      </div>
    </StepShell>
  );
}

function LivePreview({
  draft,
  preview,
  maxBudget,
}: {
  draft: VoucherDraft;
  preview: ReturnType<typeof getDiscountPreview>;
  maxBudget: number;
}) {
  return (
    <div className="sticky top-20 space-y-4">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-neutral-950">Khách thấy gì?</h2>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase text-amber-700">
            {draft.code}
          </p>
          <p className="mt-1 font-bold text-neutral-950">{draft.name}</p>
          <p className="mt-1 text-sm text-neutral-700">
            {draft.customerDescription}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-neutral-950">Preview đơn 100.000đ</h2>
        <div className="mt-3 space-y-2 text-sm">
          <PreviewRow label="Giá trị đơn" value={formatCurrency(previewSubtotal)} />
          <PreviewRow
            label="Khách được giảm"
            value={`-${formatCurrency(preview.discountAmount)}`}
            tone="discount"
          />
          <PreviewRow
            label="Khách cần trả"
            value={formatCurrency(preview.totalAfterDiscount)}
            tone="final"
          />
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-neutral-950">Cửa hàng kiểm soát gì?</h2>
        <div className="mt-3 space-y-2 text-sm">
          <PreviewRow
            label="Ngân sách tối đa"
            value={formatCurrency(maxBudget)}
          />
          <PreviewRow
            label="Số lượng phát hành"
            value={`${formatNumber(draft.issuedLimit)} voucher`}
          />
          <PreviewRow
            label="Mỗi khách dùng"
            value={`${draft.maxUsesPerCustomer} lần`}
          />
        </div>
      </section>
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-950">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ChoiceCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <span className="block font-bold text-neutral-950">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-neutral-600">
        {description}
      </span>
    </button>
  );
}

function ToggleChoice({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-lg border p-4 text-left ${
        checked
          ? "border-brand-500 bg-brand-50"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <span className="font-semibold text-neutral-900">{title}</span>
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border ${
          checked ? "border-brand-500 bg-brand-500 text-white" : "bg-white"
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

function ToggleCard({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[74px] items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
      <span className="text-sm font-semibold text-neutral-700">{title}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}

type FieldValue = string | number | undefined;

function Field<TValue extends FieldValue>({
  label,
  value,
  onChange,
  type = "text",
  suffix,
}: {
  label: string;
  value: TValue;
  onChange: (value: TValue) => void;
  type?: "text" | "number";
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <div className="mt-1 flex h-10 overflow-hidden rounded-lg border border-neutral-200 bg-white focus-within:border-brand-500">
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) => {
            const nextValue =
              type === "number" ? Number(event.target.value) : event.target.value;
            onChange(nextValue as TValue);
          }}
          className="min-w-0 flex-1 px-3 text-sm outline-none"
        />
        {suffix && (
          <span className="grid place-items-center border-l border-neutral-200 px-3 text-xs font-bold text-neutral-500">
            {suffix}
          </span>
        )}
      </div>
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
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}

function ReadOnlyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "discount" | "final";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span
        className={`font-bold ${
          tone === "discount"
            ? "text-rose-600"
            : tone === "final"
              ? "text-emerald-700"
              : "text-neutral-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[160px_1fr]">
      <span className="font-bold text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-950">{value}</span>
    </div>
  );
}

function getDiscountTypeHint(type: MarketingDiscountType) {
  if (type === "percent") return "Ví dụ giảm 50%, tối đa 50.000đ.";
  if (type === "amount") return "Ví dụ giảm thẳng 10.000đ.";
  if (type === "gift_item") return "Tặng thêm một món cụ thể.";
  if (type === "free_shipping") return "Miễn phí giao hàng.";
  if (type === "buy_x_get_y") return "Mua X sản phẩm, tặng Y sản phẩm.";
  return "Nhân điểm tích lũy.";
}

function getAudienceHint(audience: VoucherAudience) {
  if (audience === "new_customers") {
    return "Chưa từng có đơn hoàn tất hoặc chưa từng dùng voucher khách mới.";
  }
  if (audience === "existing_customers") return "Đã từng có đơn hoàn tất.";
  if (audience === "inactive_customers") return "Lâu rồi chưa quay lại.";
  if (audience === "birthday_customers") return "Có sinh nhật trong kỳ.";
  if (audience === "specific_customers") return "Chọn danh sách thủ công.";
  return "Ai có mã cũng có thể dùng nếu đủ điều kiện.";
}

function formatDiscountValue(draft: VoucherDraft) {
  if (draft.discountType === "percent") {
    return `${draft.discountValue}%, tối đa ${formatCurrency(draft.maxDiscountAmount)}`;
  }
  if (draft.discountType === "amount") {
    return formatCurrency(draft.discountValue);
  }
  return discountTypeLabels[draft.discountType].toLowerCase();
}
