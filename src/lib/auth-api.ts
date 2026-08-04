import type { Permissions } from "./permissions";
import { apiUrl } from "@/lib/api-config";
import { apiHeaders } from "@/lib/api-locale";
import { apiFallback } from "@/lib/i18n/api-fallback";

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: number;
    username?: string;
    role?: string;
    ad_soyad?: string | null;
    must_change_password?: boolean;
    tenant_id?: number;
    is_superadmin?: boolean;
    is_account_owner?: boolean;
    permissions?: Permissions;
    resetToken?: string;
    emailHint?: string;
  };
}

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text();

  if (!text.trim()) {
    if (response.status === 401) {
      return { success: false, message: apiFallback("errors.wrongPassword") };
    }
    if (response.status === 403) {
      return { success: false, message: apiFallback("errors.passiveAccount") };
    }
    throw new Error(apiFallback("errors.connection"));
  }

  try {
    const data = JSON.parse(text) as AuthResponse;
    if (!response.ok && data.success !== false) {
      return {
        success: false,
        message: data.message ?? "Giriş başarısız.",
      };
    }
    if (!response.ok && !data.message) {
      return {
        success: false,
        message:
          response.status === 401
            ? apiFallback("errors.wrongPassword")
            : apiFallback("errors.invalidRequest"),
      };
    }
    return data;
  } catch {
    throw new Error(apiFallback("errors.connection"));
  }
}

export async function checkAuth(): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth.php?action=me"), {
    method: "GET",
    headers: apiHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  return parseAuthResponse(response);
}

export async function loginAdmin(
  username: string,
  password: string,
  rememberMe = false
): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth.php?action=login"), {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ username, password, rememberMe }),
  });
  return parseAuthResponse(response);
}

export async function requestForgotPassword(
  username: string
): Promise<AuthResponse> {
  const response = await fetch(
    apiUrl("/api/auth.php?action=forgot_password_request"),
    {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ username }),
    }
  );
  return parseAuthResponse(response);
}

export async function confirmForgotPassword(payload: {
  resetToken: string;
  code: string;
  new_password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const response = await fetch(
    apiUrl("/api/auth.php?action=forgot_password_confirm"),
    {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return parseAuthResponse(response);
}

export async function logoutAdmin(): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth.php?action=logout"), {
    method: "POST",
    headers: apiHeaders(),
    credentials: "include",
  });
  return parseAuthResponse(response);
}
