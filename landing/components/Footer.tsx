"use client";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;
  return (
    <footer className="mx-auto mt-20 flex max-w-[1180px] flex-col items-start gap-7 border-t border-black/[0.06] px-4 pb-12 pt-9 text-[13px] text-ink-3 sm:mt-24 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:pb-16 sm:pt-11">
      <div className="flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-2 font-bold text-ink">
        <span className="flex items-center gap-2.5">
          <Image src="/logo-mark.svg" alt="Bimeet" width={914} height={534} className="h-[30px] w-auto shrink-0 sm:h-[36px]" />
          <span className="font-wordmark">bimeet</span>
        </span>
        <span>{f.tagline}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-[22px] gap-y-3 sm:flex sm:flex-wrap">
        <a href="#features" className="font-medium text-ink-2 hover:text-ink">
          {f.links.features}
        </a>
        <a href="#how" className="font-medium text-ink-2 hover:text-ink">
          {f.links.how}
        </a>
        <a
          href={`${APP_URL}/login`}
          className="font-medium text-ink-2 hover:text-ink"
        >
          {f.login}
        </a>
        <a
          href={`${APP_URL}/login`}
          className="font-medium text-ink-2 hover:text-ink"
        >
          {f.register}
        </a>
      </div>

      <div>
        © {new Date().getFullYear()} Bimeet. {f.copyright}
      </div>
    </footer>
  );
}
