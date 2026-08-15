"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus, Download, Clock, Sparkles, AlertCircle, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser, fetchEligibility, type EligibilityResponse } from "@/lib/auth";

interface Declaration {
  id: string;
  formType: string;
  period: string;
  status: "submitted" | "draft" | "rejected";
  submittedAt: string;
  receiptUrl?: string;
}

const mockDeclarations: Declaration[] = [
  {
    id: "1",
    formType: "270.00",
    period: "2025",
    status: "submitted",
    submittedAt: "2025-03-15T10:30:00",
    receiptUrl: "#",
  },
];

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const user = getCurrentUser();
  const [declarations] = useState<Declaration[]>(mockDeclarations);
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [eligLoading, setEligLoading] = useState(true);
  const [eligError, setEligError] = useState(false);

  const lang = i18n.language === "kk" ? "kk" : "ru";

  useEffect(() => {
    fetchEligibility()
      .then((data) => {
        setEligibility(data);
        setEligLoading(false);
      })
      .catch(() => {
        setEligError(true);
        setEligLoading(false);
      });
  }, []);

  const currentYear = new Date().getFullYear();
  const hasCurrentYearDecl = declarations.some(
    (d) => d.period === String(currentYear)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("dashboard.welcome")}, {user?.fullName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.iin")}: {user?.iin}
        </p>
      </div>

      {/* Eligibility widget */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          {eligLoading ? (
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("dashboard.eligibility_loading")}
              </p>
            </div>
          ) : eligError ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("dashboard.eligibility_error_title")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.eligibility_error_desc")}
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  <Plus className="mr-1 size-4" />
                  {t("dashboard.start_declaration")}
                </Button>
              </div>
            </div>
          ) : eligibility ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 text-primary" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("dashboard.eligibility_status_label")}
                  </p>
                  <p className="text-lg font-bold">
                    {lang === "kk" ? eligibility.title_kk : eligibility.title_ru}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lang === "kk" ? eligibility.reason_kk : eligibility.reason_ru}
                  </p>
                </div>
                <Badge variant={eligibility.is_first_time ? "secondary" : "default"}>
                  {t("dashboard.eligibility_form")} {eligibility.target_form}
                </Badge>
              </div>
              <Button className="w-full sm:w-auto">
                {t("dashboard.eligibility_cta", {
                  form: eligibility.target_form,
                  year: eligibility.target_year,
                })}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {t("dashboard.status_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("dashboard.declaration_for")} {currentYear}/{currentYear + 1}
              </p>
              <Badge variant={hasCurrentYearDecl ? "secondary" : "destructive"}>
                {hasCurrentYearDecl
                  ? t("dashboard.status_submitted")
                  : t("dashboard.status_not_filled")}
              </Badge>
            </div>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              {t("dashboard.start_declaration")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            {t("dashboard.history_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.history_empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.col_form")}</TableHead>
                  <TableHead>{t("dashboard.col_period")}</TableHead>
                  <TableHead>{t("dashboard.col_status")}</TableHead>
                  <TableHead>{t("dashboard.col_date")}</TableHead>
                  <TableHead className="text-right">
                    {t("dashboard.col_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declarations.map((decl) => (
                  <TableRow key={decl.id}>
                    <TableCell className="font-medium">
                      ФНО {decl.formType}
                    </TableCell>
                    <TableCell>{decl.period}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          decl.status === "submitted"
                            ? "secondary"
                            : decl.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {t(`dashboard.status_${decl.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(decl.submittedAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-right">
                      {decl.receiptUrl && (
                        <Button size="sm" variant="ghost">
                          <Download className="mr-1 size-4" />
                          {t("dashboard.download_receipt")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
