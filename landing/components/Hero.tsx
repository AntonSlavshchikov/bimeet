"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import { Typewriter } from "@/components/ui/typewriter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

const ratingAvatars = [
  "bg-gradient-to-br from-[#FB7185] to-[#F43F5E]",
  "bg-gradient-to-br from-[#38BDF8] to-[#0284C7]",
  "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]",
];

const chipRows = [
  { top: "12%", kind: "avatar" as const, seed: 0, stagger: 0, extra: "" },
  { top: "38%", kind: "dark" as const, seed: 1, stagger: 1, extra: "" },
  { top: "64%", kind: "avatar" as const, seed: 2, stagger: 2, extra: "hidden lg:flex" },
  { top: "88%", kind: "dark" as const, seed: 3, stagger: 3, extra: "hidden lg:flex" },
];

const sidePos = {
  left: "-left-4 sm:-left-16",
  right: "-right-4 sm:-right-16",
};

const appScreenshots = [
  "/app-screens/screen-1.png",
  "/app-screens/screen-2.png",
  "/app-screens/screen-3.png",
];

export default function Hero() {
  const { t } = useLanguage();
  const h = t.hero;
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeartbeat((v) => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const tick = Math.floor(heartbeat / 4);
  const titleTypeMs = h.title.length * 45;

  const screenshot = appScreenshots[tick % appScreenshots.length];

  return (
    <section className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:py-24">
      <div
        aria-hidden="true"
        className="hero-blob hero-blob-lime absolute -left-24 top-10 h-72 w-72 rounded-full"
      />
      <div
        aria-hidden="true"
        className="hero-blob hero-blob-ocean absolute -right-24 bottom-6 h-[26rem] w-[26rem] rounded-full"
      />

      <div className="relative z-10">
        <span className="hero-enter mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          {h.badge}
        </span>

        <h1 className="hero-title-matte pt-2 text-[clamp(2.8rem,6vw,4rem)] font-extrabold leading-[1.12] tracking-[-0.04em] text-ink">
          <div>
            <Typewriter
              key={h.title}
              text={h.title}
              speed={45}
              initialDelay={150}
              loop={false}
              showCursor={false}
              cursorChar="|"
            />
          </div>
          <div>
            <Typewriter
              key={h.titleHighlight}
              text={h.titleHighlight}
              speed={45}
              initialDelay={150 + titleTypeMs + 200}
              loop={false}
              showCursor
              hideCursorOnType
              cursorChar="|"
            />
          </div>
        </h1>

        <p className="hero-enter hero-enter-delay-2 mt-6 max-w-[420px] text-lg leading-relaxed text-ink-2">
          {h.description}
        </p>

        <div className="hero-enter hero-enter-delay-3 mt-8">
          <a href={`${APP_URL}/login`} className="gradient-button">
            <span className="text-[15px] font-semibold">{h.ctaRegister}</span>
          </a>
        </div>

        <div className="hero-enter hero-enter-delay-4 mt-7 flex items-center gap-3">
          <div className="flex">
            {ratingAvatars.map((cls, i) => (
              <span
                key={i}
                className={`-ml-2 h-8 w-8 rounded-full border-2 border-paper first:ml-0 ${cls}`}
              />
            ))}
          </div>
          <span className="text-[13px] font-semibold text-ink-2">
            {h.ratingValue} · {h.ratingLabel}
          </span>
        </div>
      </div>

      <div className="hero-phone-enter relative z-10 flex justify-center">
        <div className="hero-phone-contact-shadow" aria-hidden="true" />
        <div className="hero-phone-float hero-phone-bezel relative h-[440px] w-[220px] rounded-[38px] p-2 shadow-[0_40px_80px_rgba(15,23,42,0.25)] sm:h-[500px] sm:w-[250px]">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[30px] bg-white">
            <div className="relative z-20 flex shrink-0 items-center justify-between px-6 pb-1.5 pt-3 text-[13px] font-semibold tracking-tight text-ink">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <svg width="14" height="9" viewBox="0 0 17 11" fill="none" aria-hidden="true">
                  <rect x="0" y="6.5" width="3" height="4.5" rx="1" fill="currentColor" />
                  <rect x="4.7" y="4.5" width="3" height="6.5" rx="1" fill="currentColor" />
                  <rect x="9.4" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
                  <rect x="14.1" y="0.5" width="3" height="10.5" rx="1" fill="currentColor" />
                </svg>
                <svg width="13" height="10" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                  <path
                    d="M8 11.2a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z"
                    fill="currentColor"
                  />
                  <path
                    d="M8 3.8c1.6 0 3.05.62 4.13 1.63a.7.7 0 01-.96 1.02A5.63 5.63 0 008 5.2a5.63 5.63 0 00-3.17 1.25.7.7 0 11-.96-1.02A6.98 6.98 0 018 3.8z"
                    fill="currentColor"
                  />
                  <path
                    d="M8 0.7c2.55 0 4.87.99 6.6 2.62a.7.7 0 11-.96 1.02A8.58 8.58 0 008 2.1a8.58 8.58 0 00-5.64 2.24.7.7 0 11-.96-1.02A9.98 9.98 0 018 .7z"
                    fill="currentColor"
                  />
                </svg>
                <span className="flex h-[10px] w-[20px] items-center rounded-[3px] border border-ink/60 p-[1.5px]">
                  <span className="h-full w-[75%] rounded-[1.5px] bg-ink" />
                </span>
              </div>
            </div>

            <div className="relative flex-1">
              <div key={tick % appScreenshots.length} className="hero-screen-fade absolute inset-0">
                <Image
                  src={screenshot}
                  alt=""
                  fill
                  sizes="250px"
                  className="object-cover object-top"
                />
              </div>
            </div>

            <div className="absolute left-1/2 top-2 z-30 h-[16px] w-[44px] -translate-x-1/2 rounded-full bg-coal" />
          </div>

          <svg
            className="hero-phone-frame-svg"
            viewBox="0 0 220 440"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="phoneEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5a5a5e" />
                <stop offset="12%" stopColor="#1c1c1e" />
                <stop offset="50%" stopColor="#0a0a0b" />
                <stop offset="88%" stopColor="#1c1c1e" />
                <stop offset="100%" stopColor="#5a5a5e" />
              </linearGradient>
              <linearGradient id="phoneButton" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0a0a0b" />
                <stop offset="55%" stopColor="#3a3a3d" />
                <stop offset="100%" stopColor="#0a0a0b" />
              </linearGradient>
            </defs>

            <rect
              x="1"
              y="1"
              width="218"
              height="438"
              rx="37"
              fill="none"
              stroke="url(#phoneEdge)"
              strokeWidth="2"
            />

            <rect x="-2.5" y="70" width="3" height="16" rx="1.5" fill="url(#phoneButton)" />
            <rect x="-2.5" y="98" width="3" height="34" rx="1.5" fill="url(#phoneButton)" />
            <rect x="-2.5" y="140" width="3" height="34" rx="1.5" fill="url(#phoneButton)" />
            <rect x="219.5" y="118" width="3" height="52" rx="1.5" fill="url(#phoneButton)" />
          </svg>
        </div>

        {chipRows.map((row, i) => {
          const rowBeat = heartbeat + row.stagger * 3;
          const rowCycle = Math.floor(rowBeat / 8);
          const phase = rowBeat % 8;
          const visible = phase < 6;
          const visibilityClass = visible ? "hero-chip-pop-visible" : "hero-chip-pop-hidden";

          const side = (rowCycle + row.seed) % 2 === 0 ? "left" : "right";

          if (row.kind === "avatar") {
            const notif = h.avatarNotifications[(rowCycle + row.seed) % h.avatarNotifications.length];
            return (
              <div
                key={`chip-${i}`}
                className={`hero-chip-pop ${visibilityClass} absolute items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-[0_16px_32px_rgba(15,23,42,0.12)] flex ${sidePos[side]} ${row.extra}`}
                style={{ top: row.top }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#38BDF8] text-[11px] font-bold text-white">
                  {notif.initial}
                </span>
                {notif.text}
              </div>
            );
          }

          const notif = h.darkNotifications[(rowCycle + row.seed) % h.darkNotifications.length];
          return (
            <div
              key={`chip-${i}`}
              className={`hero-chip-pop ${visibilityClass} absolute items-center gap-2 rounded-full bg-coal px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.25)] flex ${sidePos[side]} ${row.extra}`}
              style={{ top: row.top }}
            >
              <span aria-hidden="true">✓</span>
              {notif}
            </div>
          );
        })}
      </div>
    </section>
  );
}
