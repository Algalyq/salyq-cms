export interface AuthChallengeResponse {
  challenge: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    iin: string;
    fullName: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth`
  : "http://localhost:8000/api/auth";

export async function fetchChallenge(): Promise<string> {
  const res = await fetch(`${API_BASE}/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch challenge");
  }

  const data: AuthChallengeResponse = await res.json();
  return data.challenge;
}

export async function loginWithSignature(cms: string): Promise<AuthLoginResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cms }),
  });

  if (!res.ok) {
    throw new Error("Invalid signature");
  }

  return res.json();
}

export function saveTokens(tokens: AuthLoginResponse) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
  localStorage.setItem("user", JSON.stringify(tokens.user));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getCurrentUser(): { iin: string; fullName: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/";
}

export function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export interface EligibilityResponse {
  target_form: string;
  title_ru: string;
  title_kk: string;
  reason_ru: string;
  reason_kk: string;
  is_first_time: boolean;
  target_year: number;
  user_iin: string;
  user_name: string;
}

const API_V1_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/declarations`
  : "http://localhost:8000/api/v1/declarations";

export async function fetchEligibility(): Promise<EligibilityResponse> {
  const res = await authFetch(`${API_V1_BASE}/eligibility`);

  if (!res.ok) {
    throw new Error("Failed to fetch eligibility");
  }

  return res.json();
}

// --- Payment API ---

const API_PAYMENTS_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments`
  : "http://localhost:8000/api/v1/payments";

export interface CreateQrResponse {
  operation_id: string;
  qr_token: string;
  qr_original_token: string;
  amount: number;
  status: string;
}

export interface PaymentStatusResponse {
  operation_id: string;
  status: string;
  amount: number | null;
  receipt_url: string | null;
}

export async function createPaymentQr(amount?: number): Promise<CreateQrResponse> {
  const res = await authFetch(`${API_PAYMENTS_BASE}/create-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create QR");
  }

  return res.json();
}

export async function checkPaymentStatus(operationId: string): Promise<PaymentStatusResponse> {
  const res = await authFetch(`${API_PAYMENTS_BASE}/${operationId}/status`);

  if (!res.ok) {
    throw new Error("Failed to check payment status");
  }

  return res.json();
}
