"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createPaymentQr,
  checkPaymentStatus,
  type CreateQrResponse,
} from "@/lib/auth";

type PaymentState = "loading" | "pending" | "paid" | "expired" | "error";

export default function PaymentPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<PaymentState>("loading");
  const [qrData, setQrData] = useState<CreateQrResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (operationId: string) => {
      stopPolling();

      pollRef.current = setInterval(async () => {
        try {
          const status = await checkPaymentStatus(operationId);

          if (status.status === "paid") {
            stopPolling();
            setState("paid");
          } else if (status.status === "expired" || status.status === "cancelled") {
            stopPolling();
            setState("expired");
          } else if (status.status === "failed") {
            stopPolling();
            setState("error");
            setErrorMsg(t("payment.failed_desc"));
          }
        } catch {
          // Silently continue polling on transient errors
        }
      }, 5000);
    },
    [stopPolling, t]
  );

  const generateQr = useCallback(async () => {
    setState("loading");
    setErrorMsg("");

    try {
      const result = await createPaymentQr();
      setQrData(result);
      setState("pending");
      startPolling(result.operation_id);

      // Start countdown timer if expire_date is available
      if (result.expire_date) {
        const expire = new Date(result.expire_date).getTime();
        const now = Date.now();
        const seconds = Math.max(0, Math.floor((expire - now) / 1000));
        setTimeLeft(seconds);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setState("expired");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Default TTL: 180 seconds (Kaspi default scan wait timeout)
        setTimeLeft(180);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setState("expired");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [startPolling]);

  useEffect(() => {
    generateQr();
    return () => stopPolling();
  }, [generateQr, stopPolling]);

  // --- Render ---

  if (state === "paid") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center space-y-6 px-4 py-16 text-center">
        <CheckCircle2 className="size-16 text-green-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("payment.thank_you_title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("payment.thank_you_desc")}
          </p>
        </div>
        <Button onClick={() => (window.location.href = "/dashboard")}>
          <ArrowLeft className="mr-2 size-4" />
          {t("payment.back_to_dashboard")}
        </Button>
      </div>
    );
  }

  if (state === "error" && !qrData) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center space-y-6 px-4 py-16 text-center">
        <AlertCircle className="size-16 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t("payment.error_title")}</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateQr} variant="outline">
            <RefreshCw className="mr-2 size-4" />
            {t("payment.retry")}
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft className="mr-2 size-4" />
            {t("payment.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("payment.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("payment.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {t("payment.amount_label")}:{" "}
            {qrData ? qrData.amount.toLocaleString("ru-RU") : "..."} ₸
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {state === "loading" || !qrData ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("payment.generating_qr")}
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic QR Code */}
              <div className="rounded-xl border-2 border-primary/20 bg-white p-4">
                <QRCodeSVG
                  value={qrData.qr_original_token}
                  size={240}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                {state === "pending" && (
                  <>
                    <Clock className="size-4 animate-pulse text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {t("payment.waiting_payment")}
                      {timeLeft !== null && timeLeft > 0 && (
                        <span className="ml-1 font-mono text-primary">
                          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                        </span>
                      )}
                    </span>
                  </>
                )}
                {state === "expired" && (
                  <>
                    <AlertCircle className="size-4 text-orange-500" />
                    <span className="text-sm text-orange-600">
                      {t("payment.qr_expired")}
                    </span>
                  </>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t("payment.qr_hint")}
              </p>

              {state === "expired" && (
                <Button onClick={generateQr} className="w-full">
                  <RefreshCw className="mr-2 size-4" />
                  {t("payment.generate_new_qr")}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {t("payment.auto_check_note")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => (window.location.href = "/dashboard")}
      >
        <ArrowLeft className="mr-2 size-4" />
        {t("payment.back")}
      </Button>
    </div>
  );
}
