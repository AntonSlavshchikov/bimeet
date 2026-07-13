"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

const navSections = ["features", "how", "cases"];

export default function Header() {
  const { t } = useLanguage();
  const n = t.nav;
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = navSections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-saturate-150 transition-all duration-300 ${
        isScrolled
          ? "border-black/[0.08] bg-paper/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.06)]"
          : "border-black/[0.03] bg-paper/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
        <a
          href="#"
          className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight text-ink"
        >
          <Image src="/logo-mark.svg" alt="Bimeet" width={914} height={534} className="h-[36px] w-auto shrink-0" priority />
          <span className="font-wordmark">bimeet</span>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          {(
            [
              ["features", n.features],
              ["how", n.how],
              ["cases", n.cases],
            ] as const
          ).map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={`relative pb-1 transition-colors ${
                activeSection === id
                  ? "text-ink after:absolute after:inset-x-0 after:-bottom-[1px] after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-[#FB7185] after:via-[#A78BFA] after:to-[#38BDF8]"
                  : "hover:text-ink"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <a
            href={`${APP_URL}/login`}
            className="gradient-button-light hidden px-4 py-2.5 text-sm font-semibold sm:inline-flex"
          >
            {n.login}
          </a>
          <a
            href={`${APP_URL}/login`}
            className="gradient-button-mono px-4 py-2.5 text-sm font-semibold"
          >
            {n.start}
          </a>
        </div>
      </div>
    </header>
  );
}
