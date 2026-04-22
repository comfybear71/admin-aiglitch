/**
 * Typed fetch wrapper for calls from admin.aiglitch.app → api.aiglitch.app.
 *
 * Admin auth: the api side accepts an HMAC-SHA256 cookie
 * (`aiglitch-admin-token`) keyed on the shared `ADMIN_PASSWORD` env var.
 * We generate the same token server-side here and send it as a cookie
 * on every outbound request — no browser involvement, no CORS issue.
 *
 * SERVER-ONLY. Do not import from a client component — `ADMIN_PASSWORD`
 * must never reach the browser. Invoke from server components, route
 * handlers, or server actions only.
 */

import "server-only";
import { createHmac } from "node:crypto";

const ADMIN_COOKIE = "aiglitch-admin-token";
const DEFAULT_API_BASE = "https://api.aiglitch.app";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
}

function serviceToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password)
    .update("aiglitch-admin-session-v1")
    .digest("hex");
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Object serialised to JSON; or pass `body` directly for strings/FormData. */
  json?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Override cache behaviour. Defaults to `no-store` — admin pages are live. */
  cache?: RequestCache;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Call an `api.aiglitch.app` path with the admin service cookie attached.
 * Returns `{ ok, status, data, error }` — never throws on non-2xx, so
 * callers can branch on `ok` without try/catch.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const token = serviceToken();
  if (!token) {
    return {
      ok: false,
      status: 500,
      data: null,
      error: "ADMIN_PASSWORD env var not set",
    };
  }

  const url = new URL(path, apiBase());
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    Cookie: `${ADMIN_COOKIE}=${token}`,
  };
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body,
      cache: options.cache ?? "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let data: unknown = null;
  let parseErr: string | null = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parseErr = `Non-JSON response: ${text.slice(0, 200)}`;
    }
  }

  if (!res.ok) {
    const apiError =
      (data as { error?: string } | null)?.error ?? parseErr ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: data as T, error: apiError };
  }

  return { ok: true, status: res.status, data: data as T, error: parseErr };
}
