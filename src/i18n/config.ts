import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ru from "@/locales/ru.json";
import kk from "@/locales/kk.json";

export const defaultLocale = "ru";
export const locales = ["ru", "kk"] as const;
export type Locale = (typeof locales)[number];
export const langStorageKey = "salyq-lang";

// Language is intentionally fixed to defaultLocale on init (server and first
// client render must match). The stored/browser language is applied after
// mount in I18nProvider to avoid a hydration mismatch.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      kk: { translation: kk },
    },
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs: locales as unknown as string[],
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
