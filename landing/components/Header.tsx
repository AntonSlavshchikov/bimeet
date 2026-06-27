"use client";
import { useLanguage } from "@/lib/language-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandMark from "@/components/BrandMark";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function Header() {
  const { t } = useLanguage();
  const n = t.nav;
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-paper/80 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
        <a
          href="#"
          className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight text-ink"
        >
          <BrandMark size={34} />
          Bimeet
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          <a href="#features" className="transition-colors hover:text-ink">
            {n.features}
          </a>
          <a href="#how" className="transition-colors hover:text-ink">
            {n.how}
          </a>
          <a href="#cases" className="transition-colors hover:text-ink">
            {n.cases}
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <a
            href={`${APP_URL}/login`}
            className="hidden rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white sm:inline-flex"
          >
            {n.login}
          </a>
          <a
            href={`${APP_URL}/register`}
            className="inline-flex items-center rounded-xl bg-coal px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#27272a] hover:shadow-lg"
          >
            {n.start}
          </a>
        </div>
      </div>
    </header>
  );
}
