"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export function ScrollStep({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        "relative pl-4 transition-colors duration-200",
        isActive ? "bg-gradient-to-r from-brand-50/45 to-transparent" : "",
      )}
      aria-label={label}
    >
      <span className="absolute bottom-3 left-0 top-3 w-px bg-neutral-200" aria-hidden="true" />
      <span className={clsx("absolute left-[-1px] top-8 h-7 w-0.5 rounded-full transition-all duration-200", isActive ? "bg-brand-500 shadow-[0_0_10px_rgba(225,29,72,0.28)]" : "bg-neutral-300")} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
