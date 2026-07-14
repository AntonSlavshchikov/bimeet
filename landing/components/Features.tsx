"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { BarChart3, Bell, Calendar, Car, Check, ShoppingBasket, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconStyles: Record<string, string> = {
  c1: "bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD] text-[#0369A1]",
  c2: "bg-gradient-to-br from-[#ECFCCB] to-[#D9F99D] text-[#3F6212]",
  c3: "bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] text-[#5B21B6]",
  c4: "bg-gradient-to-br from-[#FFE4E6] to-[#FFD0D6] text-[#9F1239]",
  c5: "bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] text-[#92400E]",
  c6: "bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-[#065F46]",
};

const iconMap: Record<string, LucideIcon> = {
  c1: Calendar,
  c2: Wallet,
  c3: BarChart3,
  c4: Car,
  c5: ShoppingBasket,
  c6: Bell,
};

const previewStyles: Record<string, string> = {
  c1: "bg-gradient-to-br from-[#38BDF8] to-[#0284C7]",
  c2: "bg-gradient-to-br from-[#A3E635] to-[#4D7C0F]",
  c3: "bg-gradient-to-br from-[#A78BFA] to-[#6D28D9]",
  c4: "bg-gradient-to-br from-[#FB7185] to-[#BE123C]",
  c5: "bg-gradient-to-br from-[#FBBF24] to-[#B45309]",
  c6: "bg-gradient-to-br from-[#34D399] to-[#047857]",
};

const avatarColors = [
  "bg-gradient-to-br from-[#FB7185] to-[#F43F5E]",
  "bg-gradient-to-br from-[#38BDF8] to-[#0284C7]",
  "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]",
];

function FeatureMock({ color }: { color: string }) {
  const row = "flex min-w-0 items-center gap-2.5 rounded-[12px] border border-black/[0.06] bg-soft px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3";
  const avatar = (i: number) => (
    <span
      key={i}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColors[i % 3]}`}
    >
      {["А", "М", "К"][i % 3]}
    </span>
  );

  if (color === "c1") {
    return (
      <div className="rounded-[14px] border border-black/[0.06] bg-soft p-4">
        <div className="mb-3 flex flex-col items-start gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <span className="text-[14.5px] font-semibold text-ink">Поход на выходных</span>
          <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
            Публичная
          </span>
        </div>
        <div className="mb-3 text-[13px] text-ink-2">12–13 июля · Пироговское вдхр.</div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(avatar)}
          <span className="ml-1 text-[12.5px] font-medium text-ink-2">5 / 8 идут</span>
        </div>
      </div>
    );
  }

  if (color === "c2") {
    return (
      <div className="rounded-[14px] border border-black/[0.06] bg-soft p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px] font-medium text-ink-2">
          <span>Собрано</span>
          <span className="font-semibold text-ink">18 400 из 24 000 ₽</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full w-[77%] rounded-full bg-gradient-to-r from-[#A3E635] to-[#4D7C0F]" />
        </div>
        <div className="flex flex-col gap-2">
          {[
            ["Аня", "6 000 ₽"],
            ["Макс", "5 400 ₽"],
            ["Катя", "7 000 ₽"],
          ].map(([name, sum], i) => (
            <div key={name} className={row}>
              {avatar(i)}
              <span className="flex-1 text-[13px] font-medium text-ink">{name}</span>
              <span className="text-[13px] font-semibold text-ink-2">{sum}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (color === "c3") {
    const opts: [string, number][] = [
      ["Пироговское вдхр.", 62],
      ["Рузское вдхр.", 25],
      ["Клязьминское", 13],
    ];
    return (
      <div className="rounded-[14px] border border-black/[0.06] bg-soft p-4">
        <div className="mb-3 text-[14.5px] font-semibold text-ink">Куда едем?</div>
        <div className="flex flex-col gap-2.5">
          {opts.map(([label, pct]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-ink-2">
                <span>{label}</span>
                <span className="font-semibold text-ink">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D28D9]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (color === "c4") {
    return (
      <div className="flex flex-col gap-2">
        {[
          ["Макс", "2 свободных места", true],
          ["Оля", "все места заняты", false],
        ].map(([name, seats, free], i) => (
          <div key={name as string} className={row}>
            {avatar(i)}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{name} на машине</div>
              <div className="text-[12px] text-ink-2">{seats}</div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                free ? "bg-[#DCFCE7] text-[#166534]" : "bg-black/[0.06] text-ink-2"
              }`}
            >
              {free ? "Есть места" : "Занято"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (color === "c5") {
    return (
      <div className="flex flex-col gap-2">
        {[
          ["Гриль", "Аня", true],
          ["Палатка", "Макс", true],
          ["Плед", "—", false],
        ].map(([thing, who, done], i) => (
          <div key={thing as string} className={row}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-[#34D399] text-white" : "border border-black/15 text-transparent"
              }`}
            >
              <Check size={13} strokeWidth={3} />
            </span>
            <span className={`flex-1 text-[13px] font-medium ${done ? "text-ink-2 line-through" : "text-ink"}`}>
              {thing}
            </span>
            <span className="text-[12.5px] text-ink-2">{who}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {[
        ["Катя изменила дату встречи", "5 мин назад"],
        ["Макс добавил «Палатку» в список", "38 мин назад"],
        ["Аня отметила статус «Иду»", "2 ч назад"],
      ].map(([text, time], i) => (
        <div key={text} className={row}>
          {avatar(i)}
          <span className="min-w-0 flex-1 text-[13px] text-ink">{text}</span>
          <span className="shrink-0 self-start text-[11.5px] text-ink-3 sm:self-auto">{time}</span>
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  const { t } = useLanguage();
  const f = t.features;
  const [active, setActive] = useState(0);
  const item = f.items[active];
  const Icon = iconMap[item.color];

  return (
    <section
      id="features"
      className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-16 sm:px-8 sm:py-[88px]"
    >
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="mb-3.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          {f.kicker}
        </span>
        <h2 className="text-[clamp(1.75rem,8vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.03em] text-ink">
          {f.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 sm:text-[17px]">
          {f.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0">
          {f.items.map((it, i) => {
            const TabIcon = iconMap[it.color];
            const isActive = i === active;
            return (
              <button
                key={it.title}
                type="button"
                onClick={() => setActive(i)}
                className={`flex shrink-0 items-center gap-3 rounded-[13px] px-4 py-3 text-left text-[14.5px] font-semibold transition-colors lg:shrink ${
                  isActive
                    ? "bg-ink text-white"
                    : "text-ink-2 hover:bg-white hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                    isActive ? "bg-white/15 text-white" : iconStyles[it.color]
                  }`}
                >
                  <TabIcon size={16} strokeWidth={2} />
                </span>
                {it.title}
              </button>
            );
          })}
        </div>

        <div
          key={active}
          className="hero-screen-fade relative min-w-0 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white p-5 sm:rounded-[22px] sm:p-10"
        >
          <div
            className={`mb-6 flex h-14 w-14 items-center justify-center rounded-[16px] text-white shadow-[0_10px_24px_-8px_rgba(15,23,42,0.35)] ${previewStyles[item.color]}`}
          >
            <Icon size={26} strokeWidth={2} />
          </div>
          <h3 className="mb-3 text-[24px] font-semibold tracking-[-0.02em] text-ink">
            {item.title}
          </h3>
          <p className="mb-8 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            {item.description}
          </p>
          <div className="max-w-[440px]">
            <FeatureMock color={item.color} />
          </div>
        </div>
      </div>
    </section>
  );
}
