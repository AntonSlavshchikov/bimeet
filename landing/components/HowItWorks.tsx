"use client";
import { useLanguage } from "@/lib/language-context";

export default function HowItWorks() {
  const { t } = useLanguage();
  const h = t.how;
  return (
    <section
      id="how"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-6 pb-20 sm:px-8 sm:pb-[88px]"
    >
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="mb-3.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          {h.kicker}
        </span>
        <h2 className="text-[clamp(2rem,4vw,2.5rem)] font-bold leading-tight tracking-[-0.03em] text-ink">
          {h.title}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          {h.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
        {h.steps.map((s, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-black/[0.06] bg-soft p-[30px]"
          >
            <div className="mb-[18px] flex h-10 w-10 items-center justify-center rounded-[11px] bg-ink text-[17px] font-bold text-white">
              {i + 1}
            </div>
            <h3 className="mb-2 text-[18px] font-semibold tracking-[-0.01em] text-ink">
              {s.title}
            </h3>
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
