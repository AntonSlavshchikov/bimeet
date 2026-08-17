"use client";
import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <button
      onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
      className="px-1.5 py-2 text-xs font-semibold text-ink-2 transition-colors hover:text-ink sm:px-2"
    >
      {locale === "ru" ? "EN" : "RU"}
    </button>
  );
}
