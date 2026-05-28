"use client";
import { useLanguage } from "@/lib/language-context";

const iconStyles: Record<string, string> = {
  c1: "bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD]",
  c2: "bg-gradient-to-br from-[#ECFCCB] to-[#D9F99D]",
  c3: "bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE]",
  c4: "bg-gradient-to-br from-[#FFE4E6] to-[#FFD0D6]",
  c5: "bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]",
  c6: "bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0]",
};

export default function Features() {
  const { t } = useLanguage();
  const f = t.features;
  return (
    <section
      id="features"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-6 py-20 sm:px-8 sm:py-[88px]"
    >
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="mb-3.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          {f.kicker}
        </span>
        <h2 className="text-[clamp(2rem,4vw,2.5rem)] font-bold leading-tight tracking-[-0.03em] text-ink">
          {f.title}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          {f.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {f.items.map((item) => (
          <div
            key={item.title}
            className="rounded-[18px] border border-black/[0.06] bg-white p-7 transition-all hover:-translate-y-[3px] hover:border-black/10 hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          >
            <div
              className={`mb-[18px] flex h-12 w-12 items-center justify-center rounded-[13px] text-[22px] ${
                iconStyles[item.color]
              }`}
            >
              {item.emoji}
            </div>
            <h3 className="mb-2 text-[19px] font-semibold tracking-[-0.015em] text-ink">
              {item.title}
            </h3>
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
