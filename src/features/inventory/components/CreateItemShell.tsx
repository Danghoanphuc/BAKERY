/* Hallmark · genre: editorial · macrostructure: Workbench · design-system: design.md · designed-as-app */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function CreateItemShell({
  backHref,
  eyebrow,
  title,
  description,
  children,
}: {
  backHref: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-10">
      <header className="border-b border-neutral-200 pb-6">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-bold text-neutral-600 transition-colors hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại kho
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex min-h-7 items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 text-xs font-extrabold text-brand-700">
              {eyebrow}
            </span>
            <h1 className="mt-3 min-w-0 [overflow-wrap:anywhere] font-display text-3xl font-semibold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
              {title}
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-neutral-600 sm:text-right">
            {description}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
