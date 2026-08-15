"use client";

import { useTranslation } from "react-i18next";
import { FileCheck2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileCheck2 className="size-6 shrink-0 text-primary" />
          <span className="truncate text-base font-bold sm:text-lg">
            {t("header.title")}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {t("header.badge")}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <Button size="sm" className="px-2.5 text-xs sm:px-4 sm:text-sm">
            {t("header.login_btn")}
          </Button>
        </div>
      </div>
    </header>
  );
}
