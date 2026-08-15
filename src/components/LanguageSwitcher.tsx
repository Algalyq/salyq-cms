"use client";

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const labels: Record<Locale, string> = {
    ru: t("header.lang_ru"),
    kk: t("header.lang_kk"),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="px-2.5 text-xs sm:px-3 sm:text-sm">
          <Globe />
          <span className="hidden sm:inline">
            {labels[i18n.language as Locale] ?? labels.ru}
          </span>
          <span className="sm:hidden">
            {(i18n.language as Locale)?.toUpperCase() ?? "RU"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => i18n.changeLanguage(locale)}
            data-active={i18n.language === locale}
            className="data-[active=true]:font-semibold"
          >
            {labels[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
