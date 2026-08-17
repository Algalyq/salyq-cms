"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  const { t } = useTranslation();

  const bullets = [
    t("hero.bullet_1"),
    t("hero.bullet_2"),
    t("hero.bullet_3"),
  ];

  return (
    <section className="border-b bg-gradient-to-b from-muted/50 to-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center sm:py-24">
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("hero.subtitle")}
        </p>

        <ul className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg">{t("hero.cta_main")}</Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            {t("hero.cta_secondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
