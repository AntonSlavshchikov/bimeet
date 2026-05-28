"use client";
import { useLanguage } from "@/lib/language-context";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

const dateStyles: Record<string, string> = {
  coral: "bg-gradient-to-br from-[#FFE4E6] to-[#FFD0D6] text-[#9F1239]",
  ocean: "bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD] text-[#075985]",
  lime: "bg-gradient-to-br from-[#ECFCCB] to-[#D9F99D] text-[#3F6212]",
};

const avatarStyles = [
  "bg-gradient-to-br from-[#FB7185] to-[#F43F5E]",
  "bg-gradient-to-br from-[#38BDF8] to-[#0284C7]",
  "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]",
];

export default function Hero() {
  const { t } = useLanguage();
  const h = t.hero;
  return (
    <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          {h.badge}
        </span>

        <h1 className="text-[clamp(2.6rem,6vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
          {h.title} <span className="text-ink-3">{h.titleHighlight}</span>
        </h1>

        <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-ink-2">
          {h.description}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={APP_URL}
            className="inline-flex items-center gap-2 rounded-[14px] bg-coal px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#27272a] hover:shadow-lg"
          >
            {h.cta}
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-[14px] border border-black/10 px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
          >
            {h.learn}
          </a>
        </div>

        <p className="mt-[18px] text-[13px] text-ink-3">{h.social}</p>
      </div>

      <div className="relative">
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-[18px] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-3.5 flex items-center justify-between border-b border-black/[0.06] px-1 pb-3.5">
            <span className="text-sm font-bold tracking-tight">
              {h.previewTitle}
            </span>
            <span className="rounded-full bg-soft px-2.5 py-1 text-[11px] font-semibold text-ink-2">
              {h.previewCount}
            </span>
          </div>

          {h.events.map((e, i) => (
            <div
              key={i}
              className={`grid grid-cols-[56px_1fr_auto] items-center gap-3.5 px-1.5 py-2.5 ${
                i > 0 ? "border-t border-black/[0.06]" : ""
              }`}
            >
              <div
                className={`flex h-14 w-14 flex-col justify-between rounded-[12px] border border-black/[0.06] p-2 ${
                  dateStyles[e.color]
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {e.mon}
                </span>
                <span className="text-2xl font-bold leading-none tracking-[-0.03em]">
                  {e.day}
                </span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-[-0.01em]">
                  {e.name}
                </div>
                <div className="mt-1 text-xs text-ink-2">{e.meta}</div>
              </div>
              <div className="flex">
                {e.avatars.map((a, ai) => (
                  <span
                    key={ai}
                    className={`-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white first:ml-0 ${
                      avatarStyles[ai % avatarStyles.length]
                    }`}
                  >
                    {a}
                  </span>
                ))}
                <span className="-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-soft text-[10px] font-semibold text-ink-2">
                  {e.more}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-9 -left-2 flex items-center gap-2.5 rounded-[14px] border border-black/[0.06] bg-white px-3.5 py-3 text-[13px] font-semibold shadow-[0_12px_32px_rgba(15,23,42,0.10)] sm:-left-5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#ECFCCB] text-[15px] text-[#3F6212]">
            ✓
          </span>
          <span>
            {h.chipStrong}
            <span className="mt-px block text-[11px] font-medium text-ink-3">
              {h.chipSub}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
