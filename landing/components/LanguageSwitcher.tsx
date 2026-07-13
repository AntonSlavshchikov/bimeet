"use client";
import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <button
      onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
      className="px-2 py-2 text-xs font-semibold text-ink-2 transition-colors hover:text-ink"
    >
      {locale === "ru" ? "EN" : "RU"}
    </button>
  );
}
