"use client";
import { useLanguage } from "@/lib/language-context";

export default function UseCases() {
  const { t } = useLanguage();
  const c = t.cases;
  return (
    <section
      id="cases"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-6 pb-20 sm:px-8 sm:pb-[88px]"
    >
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="mb-3.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          {c.kicker}
        </span>
        <h2 className="text-[clamp(2rem,4vw,2.5rem)] font-bold leading-tight tracking-[-0.03em] text-ink">
          {c.title}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          {c.subtitle}
        </p>
      </div>

      <div className="mx-auto flex max-w-[760px] flex-wrap justify-center gap-3">
        {c.items.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-white px-5 py-3 text-[15px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:border-black/10 hover:text-ink"
          >
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}
