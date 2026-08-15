"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ComparisonSection() {
  const { t } = useTranslation();

  const manualPoints = [1, 2, 3, 4].map((i) => ({
    title: t(`comparison.manual.point_${i}_title`),
    desc: t(`comparison.manual.point_${i}_desc`),
  }));

  const servicePoints = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`comparison.service.point_${i}_title`),
    desc: t(`comparison.service.point_${i}_desc`),
  }));

  return (
    <section className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("comparison.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("comparison.subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <Badge variant="destructive" className="w-fit">
                {t("comparison.manual.badge")}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-5">
                {manualPoints.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-semibold">{point.title}</p>
                      <p className="text-sm text-muted-foreground">{point.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-emerald-500 shadow-md",
              "relative overflow-hidden"
            )}
          >
            <CardHeader>
              <Badge className="w-fit bg-emerald-600 text-white hover:bg-emerald-600/90">
                {t("comparison.service.badge")}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-5">
                {servicePoints.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-semibold">{point.title}</p>
                      <p className="text-sm text-muted-foreground">{point.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
