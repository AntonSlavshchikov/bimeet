"use client";
import { useLanguage } from "@/lib/language-context";
import BrandMark from "@/components/BrandMark";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;
  return (
    <footer className="mx-auto mt-24 flex max-w-[1180px] flex-wrap items-center justify-between gap-6 border-t border-black/[0.06] px-6 pb-16 pt-11 text-[13px] text-ink-3 sm:px-8">
      <div className="flex items-center gap-2.5 font-bold text-ink">
        <BrandMark size={34} />
        Bimeet {f.tagline}
      </div>

      <div className="flex flex-wrap gap-[22px]">
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
          href={`${APP_URL}/register`}
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
