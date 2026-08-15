"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FileCheck2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser, logout } from "@/lib/auth";

export function DashboardHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileCheck2 className="size-6 shrink-0 text-primary" />
          <span className="truncate text-base font-bold sm:text-lg">
            {t("dashboard.header_title")}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {t("header.badge")}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-muted-foreground">
              {user?.fullName}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="px-2.5 text-xs sm:px-4 sm:text-sm"
            onClick={() => logout()}
          >
            <LogOut className="mr-1 size-4" />
            {t("dashboard.logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
