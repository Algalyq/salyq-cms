"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import i18n, { langStorageKey, locales, type Locale } from "@/i18n/config";

function detectInitialLocale(): Locale | null {
  const stored = window.localStorage.getItem(langStorageKey);
  if (stored && (locales as readonly string[]).includes(stored)) {
    return stored as Locale;
  }

  const browserLocale = window.navigator.language.slice(0, 2);
  if ((locales as readonly string[]).includes(browserLocale)) {
    return browserLocale as Locale;
  }

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const initial = detectInitialLocale();
    if (initial && initial !== i18n.language) {
      i18n.changeLanguage(initial);
    }

    const persist = (lng: string) => {
      window.localStorage.setItem(langStorageKey, lng);
    };
    i18n.on("languageChanged", persist);
    return () => {
      i18n.off("languageChanged", persist);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
