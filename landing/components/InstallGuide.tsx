"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe,
  LayoutGrid,
  Lock,
  MoreVertical,
  Share,
  Smartphone,
  SquareStack,
} from "lucide-react";

const iosStepIcons = [Compass, Share, LayoutGrid];
const androidStepIcons = [Globe, MoreVertical, LayoutGrid];

function MiniAppCard() {
  return (
    <div className="h-full rounded-[10px] border border-black/[0.06] bg-soft p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-br from-[#FB7185] to-[#38BDF8]" />
        <div className="h-1.5 w-3/5 rounded-full bg-black/[0.1]" />
      </div>
      <div className="mb-1 h-1.5 w-full rounded-full bg-black/[0.06]" />
      <div className="mb-2.5 h-1.5 w-4/5 rounded-full bg-black/[0.06]" />
      <div className="h-9 rounded-[7px] bg-gradient-to-br from-[#FB7185]/25 via-[#A78BFA]/25 to-[#38BDF8]/25" />
    </div>
  );
}

function IOSStatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-2 text-[10px] font-semibold text-ink">
      <span>9:41</span>
      <div className="flex items-center gap-[2px]">
        <svg width="10" height="7" viewBox="0 0 17 11" fill="none" aria-hidden="true">
          <rect x="0" y="6.5" width="3" height="4.5" rx="1" fill="currentColor" />
          <rect x="4.7" y="4.5" width="3" height="6.5" rx="1" fill="currentColor" />
          <rect x="9.4" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="14.1" y="0.5" width="3" height="10.5" rx="1" fill="currentColor" />
        </svg>
        <svg width="10" height="8" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path d="M8 11.2a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" fill="currentColor" />
          <path
            d="M8 3.8c1.6 0 3.05.62 4.13 1.63a.7.7 0 01-.96 1.02A5.63 5.63 0 008 5.2a5.63 5.63 0 00-3.17 1.25.7.7 0 11-.96-1.02A6.98 6.98 0 018 3.8z"
            fill="currentColor"
          />
          <path
            d="M8 0.7c2.55 0 4.87.99 6.6 2.62a.7.7 0 11-.96 1.02A8.58 8.58 0 008 2.1a8.58 8.58 0 00-5.64 2.24.7.7 0 11-.96-1.02A9.98 9.98 0 018 .7z"
            fill="currentColor"
          />
        </svg>
        <span className="flex h-[8px] w-[14px] items-center rounded-[2.5px] border border-ink/60 p-[1px]">
          <span className="h-full w-[75%] rounded-[1px] bg-ink" />
        </span>
      </div>
    </div>
  );
}

function AndroidStatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between px-3.5 pb-1 pt-2 text-[10px] font-semibold text-ink">
      <span>9:41</span>
      <div className="flex items-center gap-[5px]">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <circle cx="2" cy="6.5" r="1.1" fill="currentColor" />
          <circle cx="5" cy="4.5" r="1.1" fill="currentColor" />
          <circle cx="8" cy="1.8" r="1.1" fill="currentColor" />
        </svg>
        <svg width="10" height="8" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path
            d="M8 3.8c1.6 0 3.05.62 4.13 1.63a.7.7 0 01-.96 1.02A5.63 5.63 0 008 5.2a5.63 5.63 0 00-3.17 1.25.7.7 0 11-.96-1.02A6.98 6.98 0 018 3.8z"
            fill="currentColor"
          />
          <path d="M8 11.2a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" fill="currentColor" />
        </svg>
        <span className="h-[9px] w-[16px] rounded-[2px] bg-ink" />
      </div>
    </div>
  );
}

function IOSScreen({ step }: { step: number }) {
  return (
    <>
      <IOSStatusBar />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[7px] z-30 h-[11px] w-[32px] -translate-x-1/2 rounded-full bg-coal"
      />

      <div className="flex shrink-0 items-center gap-1.5 border-b border-black/[0.06] px-2.5 pb-2">
        <span
          className={`flex h-6 flex-1 items-center justify-center gap-1 rounded-full text-[9px] font-medium transition-all ${
            step === 0 ? "install-glow bg-white text-ink ring-1 ring-black/[0.08]" : "bg-soft text-ink-2"
          }`}
        >
          <Lock size={8} strokeWidth={2.4} />
          bimeet.app
        </span>
      </div>

      <div className="relative flex-1 p-2.5">
        <MiniAppCard />

        {step === 2 && (
          <div className="install-sheet-in absolute inset-x-2 bottom-2 overflow-hidden rounded-[12px] border border-black/[0.06] bg-white shadow-[0_-10px_24px_rgba(15,23,42,0.12)]">
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#FB7185]/18 via-[#A78BFA]/18 to-[#38BDF8]/18 px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#FB7185] to-[#38BDF8] text-white">
                <LayoutGrid size={11} strokeWidth={2.5} />
              </span>
              <span className="text-[9px] font-semibold text-ink">На экран «Домой»</span>
            </div>
            <div className="border-t border-black/[0.05] px-2.5 py-1.5 text-[8.5px] text-ink-3">Добавить в закладки</div>
            <div className="border-t border-black/[0.05] px-2.5 py-1.5 text-[8.5px] text-ink-3">Копировать</div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-black/[0.06] px-4 py-2.5">
        <ChevronLeft size={13} strokeWidth={2.2} className="text-ink-3" />
        <ChevronRight size={13} strokeWidth={2.2} className="text-ink-3" />
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
            step === 1 ? "install-glow bg-gradient-to-br from-[#FB7185] to-[#38BDF8] text-white" : "text-ink-3"
          }`}
        >
          <Share size={12} strokeWidth={2.2} />
        </span>
        <SquareStack size={13} strokeWidth={2.2} className="text-ink-3" />
      </div>
    </>
  );
}

function AndroidScreen({ step }: { step: number }) {
  return (
    <>
      <AndroidStatusBar />

      <div className="relative flex shrink-0 items-center gap-1.5 border-b border-black/[0.06] px-2.5 pb-2">
        <span
          className={`flex h-6 flex-1 items-center gap-1.5 rounded-full px-2.5 text-[9px] font-medium transition-all ${
            step === 0 ? "install-glow bg-white text-ink ring-1 ring-black/[0.08]" : "bg-soft text-ink-2"
          }`}
        >
          <Lock size={8} strokeWidth={2.4} />
          bimeet.app
        </span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
            step === 1 ? "install-glow bg-gradient-to-br from-[#FB7185] to-[#38BDF8] text-white" : "text-ink-3"
          }`}
        >
          <MoreVertical size={13} strokeWidth={2.2} />
        </span>

        {step === 2 && (
          <div className="install-sheet-in absolute right-2 top-[calc(100%+2px)] z-10 w-[118px] overflow-hidden rounded-[10px] border border-black/[0.06] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
            <div className="px-2.5 py-1.5 text-[8.5px] text-ink-3">Новая вкладка</div>
            <div className="border-t border-black/[0.05] px-2.5 py-1.5 text-[8.5px] text-ink-3">История</div>
            <div className="flex items-center gap-1.5 border-t border-black/[0.05] bg-gradient-to-r from-[#FB7185]/18 via-[#A78BFA]/18 to-[#38BDF8]/18 px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#FB7185] to-[#38BDF8] text-white">
                <LayoutGrid size={11} strokeWidth={2.5} />
              </span>
              <span className="text-[8.5px] font-semibold text-ink">Установить приложение</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-1 p-2.5">
        <MiniAppCard />
      </div>

      <div className="flex shrink-0 items-center justify-center border-t border-black/[0.06] py-3">
        <span className="h-[4px] w-[64px] rounded-full bg-ink/70" />
      </div>
    </>
  );
}

export default function InstallGuide() {
  const { t } = useLanguage();
  const ig = t.install;
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [step, setStep] = useState(0);
  const steps = ig[platform].steps;
  const stepIcons = platform === "ios" ? iosStepIcons : androidStepIcons;

  function selectPlatform(p: "ios" | "android") {
    setPlatform(p);
    setStep(0);
  }

  return (
    <section
      id="install"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-6 pb-20 sm:px-8 sm:pb-[88px]"
    >
      <div className="mx-auto mb-10 max-w-[640px] text-center">
        <span className="mb-3.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          {ig.kicker}
        </span>
        <h2 className="text-[clamp(2rem,4vw,2.5rem)] font-bold leading-tight tracking-[-0.03em] text-ink">
          {ig.title}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          {ig.subtitle}
        </p>
      </div>

      <div className="mx-auto flex w-fit gap-1 rounded-[13px] bg-soft p-1">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPlatform(p)}
            className={`flex items-center gap-2 rounded-[9px] px-5 py-2.5 text-[14px] font-semibold transition-colors ${
              platform === p ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            <Smartphone size={15} strokeWidth={2} />
            {ig.tabs[p]}
          </button>
        ))}
      </div>

      <div
        key={platform}
        className="hero-screen-fade mx-auto mt-12 grid max-w-[920px] grid-cols-1 items-center gap-10 lg:grid-cols-[240px_1fr]"
      >
        <div className="mx-auto flex justify-center">
          <div className="relative h-[320px] w-[160px] rounded-[32px] bg-coal p-[7px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)]">
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[26px] bg-white">
              {platform === "ios" ? <IOSScreen step={step} /> : <AndroidScreen step={step} />}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {steps.map((s, i) => {
            const Icon = stepIcons[i];
            const isActive = i === step;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-start gap-4 rounded-[16px] border p-4 text-left transition-all ${
                  isActive
                    ? "border-transparent bg-soft shadow-[0_1px_0_rgba(10,10,11,0.04)]"
                    : "border-transparent hover:bg-soft/60"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#FB7185] via-[#A78BFA] to-[#38BDF8] text-white"
                      : "bg-white text-ink-3"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <div>
                  <h3 className={`mb-1 text-[16px] font-semibold tracking-[-0.01em] ${isActive ? "text-ink" : "text-ink-2"}`}>
                    {i + 1}. {s.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
