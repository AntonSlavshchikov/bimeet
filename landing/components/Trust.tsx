"use client";
import { useLanguage } from "@/lib/language-context";

export default function Trust() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-y border-black/[0.06] py-7 text-[13px]">
        {t.trust.map((s, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              {s.value}
            </span>
            <span className="font-semibold uppercase tracking-wide text-ink-3">
              {s.label}
            </span>
            {i < t.trust.length - 1 && (
              <span className="ml-2 text-black/10">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
