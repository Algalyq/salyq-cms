"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NCALAYER_WSS_URL = "wss://127.0.0.1:13579/";
const NCALAYER_WS_URL = "ws://127.0.0.1:13579/";
const CONNECT_TIMEOUT_MS = 2000;

export type NCALayerErrorType =
  | "canceled"
  | "wrong_pin"
  | "expired"
  | "invalid_sig"
  | "unknown";

export class NCALayerError extends Error {
  type: NCALayerErrorType;

  constructor(type: NCALayerErrorType, message: string) {
    super(message);
    this.name = "NCALayerError";
    this.type = type;
  }
}

interface NCALayerResponse {
  // New format (kz.gov.pki.knca.basics): { body: { result: string[] }, status: boolean }
  status?: boolean;
  body?: { result?: string[] };
  // Old format (kz.gov.pki.knca.applet)
  success?: boolean;
  result?: string | { version?: string };
  errorCode?: string;
  code?: string;
  message?: string;
  response?: string;
  responseObject?: string;
  getResult?: string;
}

function classifyError(errorCode: string, message?: string): NCALayerErrorType {
  const lowerMsg = (message ?? "").toLowerCase();
  const lowerCode = (errorCode ?? "").toLowerCase();

  if (
    lowerCode === "user_canceled" ||
    lowerCode === "canceled" ||
    lowerCode === "500" ||
    lowerMsg.includes("cancel") ||
    lowerMsg.includes("отмен")
  ) {
    return "canceled";
  }
  if (
    lowerCode === "wrong_password" ||
    lowerCode === "wrong_pin" ||
    lowerCode === "0x08000000" ||
    lowerMsg.includes("wrong password") ||
    lowerMsg.includes("неверный") ||
    lowerMsg.includes("pin") ||
    lowerMsg.includes("парол")
  ) {
    return "wrong_pin";
  }
  if (
    lowerMsg.includes("expired") ||
    lowerMsg.includes("истек") ||
    lowerMsg.includes("мерзім")
  ) {
    return "expired";
  }
  if (lowerMsg.includes("signature") || lowerMsg.includes("подпись")) {
    return "invalid_sig";
  }
  return "unknown";
}

function extractSignature(resp: NCALayerResponse): string {
  // New format: body.result is an array of CMS strings
  if (resp.body?.result && Array.isArray(resp.body.result)) {
    return resp.body.result[0] ?? "";
  }
  if (typeof resp.result === "string") {
    return resp.result;
  }
  return resp.response ?? resp.responseObject ?? resp.getResult ?? "";
}

export function useNCALayer() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(0);
  const pendingResolveRef = useRef<((value: string) => void) | null>(null);
  const pendingRejectRef = useRef<((error: NCALayerError) => void) | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    console.log("[NCALayer] WS message received:", event.data);
    try {
      const data: NCALayerResponse = JSON.parse(event.data);

      // Ignore info messages (e.g. version) when no pending request
      if (data.status === undefined && data.success === undefined && data.code === undefined) {
        console.log("[NCALayer] Info message (ignored):", data);
        return;
      }

      // New format: { body: { result: [...] }, status: true/false }
      if (data.status === true) {
        const sig = extractSignature(data);
        console.log("[NCALayer] Signature extracted, length:", sig.length);
        if (pendingResolveRef.current) {
          pendingResolveRef.current(sig);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      } else if (data.status === false) {
        const errorType = classifyError(data.errorCode ?? "", data.message);
        console.log("[NCALayer] Error classified as:", errorType, "errorCode:", data.errorCode);
        if (pendingRejectRef.current) {
          pendingRejectRef.current(
            new NCALayerError(errorType, data.errorCode ?? data.message ?? "unknown")
          );
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      } else if (data.success === true) {
        // Alternate new format: { success: true, result: "..." }
        const sig = extractSignature(data);
        console.log("[NCALayer] Signature extracted (success format), length:", sig.length);
        if (pendingResolveRef.current) {
          pendingResolveRef.current(sig);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      } else if (data.success === false) {
        const errorType = classifyError(data.errorCode ?? "", data.message);
        console.log("[NCALayer] Error (success format) classified as:", errorType, "errorCode:", data.errorCode);
        if (pendingRejectRef.current) {
          pendingRejectRef.current(
            new NCALayerError(errorType, data.errorCode ?? data.message ?? "unknown")
          );
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      } else if (data.code === "200" || data.code === "OK") {
        // Old format fallback
        const sig = extractSignature(data);
        console.log("[NCALayer] Signature extracted (old format), length:", sig.length);
        if (pendingResolveRef.current) {
          pendingResolveRef.current(sig);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      } else {
        const errorType = classifyError(data.code ?? "", data.message);
        console.log("[NCALayer] Error (old format) classified as:", errorType);
        if (pendingRejectRef.current) {
          pendingRejectRef.current(
            new NCALayerError(errorType, data.message ?? data.code ?? "unknown")
          );
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      }
    } catch {
      console.error("[NCALayer] Failed to parse WS message");
      if (pendingRejectRef.current) {
        pendingRejectRef.current(new NCALayerError("unknown", "Parse error"));
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      }
    }
  }, []);

  const connect = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsChecking(true);

      let settled = false;

      const finish = (success: boolean, ws?: WebSocket) => {
        if (settled) return;
        settled = true;
        if (success && ws) {
          wsRef.current = ws;
          ws.onmessage = handleMessage;
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
        }
        setIsChecking(false);
        resolve(success);
      };

      const tryConnect = (url: string, isFallback: boolean) => {
        console.log(`[NCALayer] Trying ${url}...`);
        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
        } catch (e) {
          console.error(`[NCALayer] WebSocket constructor failed for ${url}`, e);
          if (!isFallback) {
            tryConnect(NCALAYER_WS_URL, true);
          } else {
            finish(false);
          }
          return;
        }

        const timeout = setTimeout(() => {
          console.log(`[NCALayer] Timeout for ${url}`);
          ws.onopen = null;
          ws.onclose = null;
          ws.onerror = null;
          ws.onmessage = null;
          try { ws.close(); } catch { /* ignore */ }
          if (!isFallback) {
            tryConnect(NCALAYER_WS_URL, true);
          } else {
            finish(false);
          }
        }, CONNECT_TIMEOUT_MS);

        ws.onopen = () => {
          console.log(`[NCALayer] Connected to ${url}`);
          clearTimeout(timeout);
          ws.onclose = null;
          ws.onerror = null;
          finish(true, ws);
        };

        ws.onerror = () => {
          console.log(`[NCALayer] Error for ${url}`);
          clearTimeout(timeout);
          ws.onopen = null;
          ws.onclose = null;
          ws.onmessage = null;
          try { ws.close(); } catch { /* ignore */ }
          if (!isFallback) {
            tryConnect(NCALAYER_WS_URL, true);
          } else {
            finish(false);
          }
        };

        ws.onclose = () => {
          console.log(`[NCALayer] Closed for ${url}`);
          clearTimeout(timeout);
          ws.onopen = null;
          ws.onerror = null;
          ws.onmessage = null;
          if (!isFallback) {
            tryConnect(NCALAYER_WS_URL, true);
          } else {
            finish(false);
          }
        };
      };

      tryConnect(NCALAYER_WSS_URL, false);
    });
  }, [handleMessage]);

  const checkConnection = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsAvailable(true);
      setIsChecking(false);
      return true;
    }
    return connect();
  }, [connect]);

  const getSignAuthKey = useCallback(
    (challenge: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.error("[NCALayer] getSignAuthKey: WS not connected");
          reject(new NCALayerError("unknown", "NCALayer not connected"));
          return;
        }

        messageIdRef.current += 1;
        const messageId = messageIdRef.current;

        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;

        const request = {
          module: "kz.gov.pki.knca.basics",
          method: "sign",
          args: {
            allowedStorages: ["PKCS12"],
            format: "cms",
            data: challenge,
            signingParams: {
              decode: false,
              encapsulate: true,
              digested: false,
              tsaProfile: {},
            },
            signerParams: {
              extKeyUsageOids: ["1.3.6.1.5.5.7.3.2"],
            },
            locale: "ru",
          },
          messageId,
        };

        console.log("[NCALayer] Sending sign request:", JSON.stringify(request));

        ws.send(JSON.stringify(request));

        setTimeout(() => {
          if (pendingRejectRef.current) {
            console.error("[NCALayer] getSignAuthKey: Timeout (60s)");
            pendingRejectRef.current(new NCALayerError("unknown", "Timeout"));
            pendingResolveRef.current = null;
            pendingRejectRef.current = null;
          }
        }, 60000);
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsAvailable(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isAvailable,
    isChecking,
    checkConnection,
    getSignAuthKey,
    disconnect,
  };
}
