"use client";
import { useLanguage } from "@/lib/language-context";

export default function Trust() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
      <div className="flex flex-col gap-5 border-y border-black/[0.06] py-6 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-3 sm:py-7">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3">
          {t.trust.map((s, i) => (
            <span key={i} className="flex min-w-0 items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-ink">
                {s.value}
              </span>
              <span className="font-semibold uppercase tracking-wide text-ink-3">
                {s.label}
              </span>
              {i < t.trust.length - 1 && (
                <span className="ml-2 hidden text-black/10 sm:inline">·</span>
              )}
            </span>
          ))}
        </div>
        <span className="text-[11.5px] text-ink-3">{t.trustSource}</span>
      </div>
    </div>
  );
}
