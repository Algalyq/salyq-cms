"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useNCALayer, NCALayerError, type NCALayerErrorType } from "@/hooks/useNCALayer";
import {
  fetchChallenge,
  loginWithSignature,
  saveTokens,
  createQrAuthSession,
  pollQrAuthStatus,
  type QrCreateResponse,
} from "@/lib/auth";

type ModalState = "checking" | "not_found" | "ready" | "signing" | "error";
type AuthMethod = "ncalayer" | "qr";
type QrState = "creating" | "waiting" | "success" | "expired" | "error";

const NCALAYER_DOWNLOAD_URL = "https://pki.gov.kz/ncalayer/";

export function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { isAvailable, isChecking, checkConnection, getSignAuthKey } = useNCALayer();
  const [state, setState] = useState<ModalState>("checking");
  const [errorType, setErrorType] = useState<NCALayerErrorType>("unknown");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("ncalayer");

  // QR state
  const [qrState, setQrState] = useState<QrState>("creating");
  const [qrSession, setQrSession] = useState<QrCreateResponse | null>(null);
  const [qrError, setQrError] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCheck = useCallback(async () => {
    console.log("[AuthModal] runCheck started");
    setState("checking");
    const available = await checkConnection();
    console.log("[AuthModal] checkConnection result:", available);
    setState(available ? "ready" : "not_found");
    console.log("[AuthModal] state set to:", available ? "ready" : "not_found");
  }, [checkConnection]);

  useEffect(() => {
    if (open) {
      console.log("[AuthModal] Modal opened, running check...");
      runCheck();
    }
  }, [open, runCheck]);

  // Cleanup polling on close
  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setAuthMethod("ncalayer");
      setQrState("creating");
      setQrSession(null);
      setQrError("");
    }
  }, [open]);

  const handleAuth = useCallback(async () => {
    console.log("[AuthModal] handleAuth started");
    setState("signing");
    try {
      console.log("[AuthModal] Fetching challenge...");
      const challenge = await fetchChallenge();
      console.log("[AuthModal] Challenge received:", challenge);
      console.log("[AuthModal] Requesting NCALayer signature...");
      const cms = await getSignAuthKey(challenge);
      console.log("[AuthModal] CMS signature received:", cms);
      console.log("[AuthModal] Sending to backend for login...");
      const tokens = await loginWithSignature(cms);
      console.log("[AuthModal] Login success, saving tokens...");
      saveTokens(tokens);
      onOpenChange(false);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("[AuthModal] handleAuth error:", err);
      if (err instanceof NCALayerError) {
        setErrorType(err.type);
        console.error("[AuthModal] NCALayerError type:", err.type, "message:", err.message);
      } else {
        setErrorType("invalid_sig");
        console.error("[AuthModal] Non-NCALayer error:", err);
      }
      setState("error");
    }
  }, [getSignAuthKey, onOpenChange]);

  const startQrAuth = useCallback(async () => {
    setQrState("creating");
    setQrError("");
    setQrSession(null);

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    try {
      const session = await createQrAuthSession();
      setQrSession(session);
      setQrState("waiting");

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const result = await pollQrAuthStatus(session.session_id);

          if (result.status === "success" && result.accessToken) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setQrState("success");
            saveTokens({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken || "",
              user: result.user || { iin: "", fullName: "" },
            });
            setTimeout(() => {
              onOpenChange(false);
              window.location.href = "/dashboard";
            }, 1000);
          } else if (
            result.status === "expired" ||
            result.status === "canceled" ||
            result.status === "failed"
          ) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setQrState("expired");
          } else if (result.status === "error") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setQrState("error");
            setQrError(t("auth_modal.qr_error"));
          }
        } catch {
          // Keep polling on transient errors
        }
      }, 3000);
    } catch (err) {
      console.error("[AuthModal] QR create error:", err);
      setQrState("error");
      setQrError(err instanceof Error ? err.message : t("auth_modal.qr_error"));
    }
  }, [onOpenChange, t]);

  // Start QR auth when switching to QR tab
  useEffect(() => {
    if (open && authMethod === "qr" && qrState === "creating" && !qrSession) {
      startQrAuth();
    }
  }, [open, authMethod, qrState, qrSession, startQrAuth]);

  const errorKey = `auth_modal.error_${errorType}` as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            {t("auth_modal.title")}
          </DialogTitle>
          <DialogDescription>{t("auth_modal.subtitle")}</DialogDescription>
        </DialogHeader>

        {/* Method selector tabs */}
        <div className="flex gap-2 rounded-lg bg-muted p-1">
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              authMethod === "ncalayer"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setAuthMethod("ncalayer")}
          >
            <KeyRound className="size-4" />
            NCALayer
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              authMethod === "qr"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setAuthMethod("qr");
              setQrState("creating");
              setQrSession(null);
              setQrError("");
            }}
          >
            <Smartphone className="size-4" />
            eGov QR
          </button>
        </div>

        {/* === NCALayer method === */}

        {authMethod === "ncalayer" && (
          <>
            {/* STATE: CHECKING */}
            {state === "checking" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("auth_modal.status_checking")}
                </p>
              </div>
            )}

            {/* STATE: NOT FOUND */}
            {state === "not_found" && (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>{t("auth_modal.status_not_found")}</AlertTitle>
                  <AlertDescription>{t("auth_modal.not_found_desc")}</AlertDescription>
                </Alert>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1">
                    <a href={NCALAYER_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                      <Download />
                      {t("auth_modal.download_btn")}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={runCheck}
                    disabled={isChecking}
                  >
                    <RefreshCw className={isChecking ? "animate-spin" : ""} />
                    {t("auth_modal.btn_retry")}
                  </Button>
                </div>
              </div>
            )}

            {/* STATE: READY */}
            {state === "ready" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white">
                    <ShieldCheck className="size-3" />
                    {t("auth_modal.status_connected")}
                  </Badge>
                </div>
                <Button size="lg" className="w-full" onClick={handleAuth}>
                  <KeyRound />
                  {t("auth_modal.btn_select_key")}
                </Button>
              </div>
            )}

            {/* STATE: SIGNING */}
            {state === "signing" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white">
                    <ShieldCheck className="size-3" />
                    {t("auth_modal.status_connected")}
                  </Badge>
                </div>
                <Button size="lg" className="w-full" disabled>
                  <Loader2 className="animate-spin" />
                  {t("auth_modal.btn_signing")}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {t("auth_modal.signing_hint")}
                </p>
              </div>
            )}

            {/* STATE: ERROR */}
            {state === "error" && (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{t(errorKey)}</AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={runCheck}>
                  <RefreshCw />
                  {t("auth_modal.btn_try_again")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* === eGov QR method === */}

        {authMethod === "qr" && (
          <>
            {/* QR: CREATING */}
            {qrState === "creating" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("auth_modal.qr_generating")}
                </p>
              </div>
            )}

            {/* QR: WAITING */}
            {qrState === "waiting" && qrSession && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border-2 border-primary/20 p-4">
                  <img
                    src={`data:image/png;base64,${qrSession.qr_code}`}
                    alt="eGov QR"
                    className="size-56"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("auth_modal.qr_waiting")}
                  </span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {t("auth_modal.qr_scan_hint")}
                </p>
              </div>
            )}

            {/* QR: SUCCESS */}
            {qrState === "success" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <ShieldCheck className="size-12 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-600">
                  {t("auth_modal.qr_success")}
                </p>
              </div>
            )}

            {/* QR: EXPIRED */}
            {qrState === "expired" && (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{t("auth_modal.qr_expired")}</AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={startQrAuth}>
                  <RefreshCw />
                  {t("auth_modal.qr_retry")}
                </Button>
              </div>
            )}

            {/* QR: ERROR */}
            {qrState === "error" && (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{qrError || t("auth_modal.qr_error")}</AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={startQrAuth}>
                  <RefreshCw />
                  {t("auth_modal.qr_retry")}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
