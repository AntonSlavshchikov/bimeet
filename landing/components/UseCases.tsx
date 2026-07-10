"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";

const tints = [
  "border-[#FB7185]/25 hover:border-[#FB7185]/50 hover:bg-[#FB7185]/[0.06]",
  "border-[#A78BFA]/25 hover:border-[#A78BFA]/50 hover:bg-[#A78BFA]/[0.06]",
  "border-[#38BDF8]/25 hover:border-[#38BDF8]/50 hover:bg-[#38BDF8]/[0.06]",
];

const rotations = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-0"];
const sizes = ["text-[15px] px-5 py-3", "text-[16.5px] px-6 py-3.5", "text-[14px] px-4 py-2.5"];

export default function UseCases() {
  const { t } = useLanguage();
  const c = t.cases;
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
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
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

      <div className="mx-auto flex max-w-[800px] flex-wrap justify-center gap-4">
        {c.items.map((it, i) => (
          <span
            key={it}
            className={`inline-flex items-center gap-2.5 rounded-full border bg-white font-semibold text-ink-2 shadow-[0_1px_2px_rgba(10,10,11,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:rotate-0 hover:text-ink hover:shadow-[0_10px_24px_-10px_rgba(10,10,11,0.2)] ${tints[i % tints.length]} ${rotations[i % rotations.length]} ${sizes[i % sizes.length]}`}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? undefined : "translateY(10px) scale(0.94)",
              transitionDelay: `${i * 60}ms`,
            }}
          >
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}
