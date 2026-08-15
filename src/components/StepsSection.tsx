"use client";

import { useTranslation } from "react-i18next";
import { KeyRound, FileText, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const icons = [KeyRound, FileText, Send];

export function StepsSection() {
  const { t } = useTranslation();

  const steps = [1, 2, 3].map((i) => ({
    title: t(`steps.step_${i}_title`),
    desc: t(`steps.step_${i}_desc`),
    Icon: icons[i - 1],
  }));

  return (
    <section className="border-b bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {t("steps.title")}
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map(({ title, desc, Icon }) => (
            <Card key={title}>
              <CardContent className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-6 text-primary" />
                </div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
