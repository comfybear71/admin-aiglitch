/**
 * Typed fetch wrapper for admin API calls.
 *
 * Browser: same-origin `/api/admin/*` → next.config rewrites → api.aiglitch.app
 * Server components: forward admin cookie; use API_PROXY_TARGET in local dev
 * or the incoming request host in production.
 */

import { cookies, headers } from "next/headers";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function resolveBaseUrl(): Promise<string> {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Local dev: hit aiglitch-api directly when admin was started with API_PROXY_TARGET
  const proxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (proxy) return proxy;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return `http://localhost:${process.env.PORT ?? "3003"}`;
}

async function buildCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  const store = await cookies();
  const pairs = store.getAll().map((c) => `${c.name}=${c.value}`);
  return pairs.length > 0 ? pairs.join("; ") : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit & { json?: unknown; query?: Record<string, unknown> },
): Promise<ApiResult<T>> {
  const base = await resolveBaseUrl();
  const url = new URL(path, base.endsWith("/") ? base : `${base}/`);

  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const cookieHeader = await buildCookieHeader();
  const { json, query: _query, ...fetchOptions } = options ?? {};

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...fetchOptions.headers,
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
      cache: "no-store",
    });

    let payload: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          error: text.slice(0, 200) || `HTTP ${response.status}`,
        };
      }
      return { ok: false, error: "Unexpected non-JSON response from API" };
    }

    if (!response.ok) {
      const err =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `HTTP ${response.status}`;
      return { ok: false, error: err };
    }

    return { ok: true, data: payload as T };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const hint = process.env.API_PROXY_TARGET
      ? ""
      : " Start admin with API_PROXY_TARGET=http://localhost:3000 and ensure aiglitch-api is running.";
    return { ok: false, error: `${msg}.${hint}` };
  }
}
