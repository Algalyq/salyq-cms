"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
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
import { fetchChallenge, loginWithSignature, saveTokens } from "@/lib/auth";

type ModalState = "checking" | "not_found" | "ready" | "signing" | "error";

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
            <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
              AUTH_KEY_...p12
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
      </DialogContent>
    </Dialog>
  );
}
