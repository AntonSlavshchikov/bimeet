"use client";
import { useLanguage } from "@/lib/language-context";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function CTA() {
  const { t } = useLanguage();
  const c = t.cta;
  return (
    <section className="relative mx-auto max-w-[1180px] px-6 pb-2 sm:px-8">
      {/* colour lives behind the card, on the page itself — the glass reveals it, doesn't contain it */}
      <div className="liquid-glass-blob liquid-glass-blob-a" aria-hidden="true" />
      <div className="liquid-glass-blob liquid-glass-blob-b" aria-hidden="true" />
      <div className="liquid-glass-blob liquid-glass-blob-c" aria-hidden="true" />

      <div className="liquid-glass-pane relative overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-12 sm:py-16">
        <h2 className="mx-auto max-w-[620px] text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink [text-shadow:0_2px_20px_rgba(255,255,255,0.4)]">
          {c.title}
        </h2>
        <p className="mx-auto mt-[18px] max-w-[460px] text-[17px] leading-relaxed text-ink-2">
          {c.subtitle}
        </p>
        <a
          href={`${APP_URL}/login`}
          className="liquid-glass-btn mt-[30px] inline-flex items-center gap-2 rounded-[14px] px-6 py-3.5 text-[15px] font-semibold text-ink transition-all hover:-translate-y-0.5"
        >
          {c.button}
        </a>
      </div>
    </section>
  );
}
