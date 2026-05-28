"use client";
import { useLanguage } from "@/lib/language-context";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function CTA() {
  const { t } = useLanguage();
  const c = t.cta;
  return (
    <section className="mx-auto max-w-[1180px] px-6 pb-2 sm:px-8">
      <div className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(212,255,63,0.14), transparent 45%), radial-gradient(circle at 10% 100%, rgba(167,139,250,0.16), transparent 45%)",
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-[620px] text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {c.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[460px] text-[17px] leading-relaxed text-white/70">
            {c.subtitle}
          </p>
          <a
            href={APP_URL}
            className="mt-[30px] inline-flex items-center gap-2 rounded-[14px] bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-soft"
          >
            {c.button}
          </a>
        </div>
      </div>
    </section>
  );
}
