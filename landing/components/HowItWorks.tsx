"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { CalendarPlus, CheckCircle2, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const stepIcons: LucideIcon[] = [CalendarPlus, Link2, CheckCircle2];

export default function HowItWorks() {
  const { t } = useLanguage();
  const h = t.how;
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-6 pb-20 sm:px-8 sm:pb-[88px]"
    >
      <div className="mx-auto mb-14 max-w-[640px] text-center">
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

      <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-3">
        {h.steps.map((s, i) => {
          const Icon = stepIcons[i];
          return (
            <div key={i} className="flex sm:contents">
              <div
                className="flex flex-1 flex-col items-start gap-5 transition-all duration-700 ease-out sm:items-center sm:text-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transitionDelay: `${i * 160}ms`,
                }}
              >
                <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_10px_20px_-8px_rgba(10,10,11,0.45)] ring-[6px] ring-black/[0.04]">
                  <Icon size={20} strokeWidth={2} />
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[3px] border-paper bg-ink-3 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1.5 text-[18px] font-semibold tracking-[-0.01em] text-ink">
                    {s.title}
                  </h3>
                  <p className="text-[14.5px] leading-relaxed text-ink-2 sm:max-w-[26ch]">
                    {s.description}
                  </p>
                </div>
              </div>
              {i < h.steps.length - 1 && (
                <div className="relative mt-[26px] hidden h-0.5 w-8 shrink-0 self-start overflow-hidden bg-black/[0.08] sm:block lg:w-14">
                  <div
                    className="h-full origin-left bg-ink transition-transform duration-500 ease-out"
                    style={{
                      transform: visible ? "scaleX(1)" : "scaleX(0)",
                      transitionDelay: `${i * 160 + 260}ms`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
