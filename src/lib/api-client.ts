/**
 * Typed fetch wrapper for admin API calls.
 * Calls are transparently proxied to https://api.aiglitch.app via next.config.ts rewrites.
 */

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { json?: unknown; query?: Record<string, unknown> },
): Promise<T & { ok?: boolean; error?: string; data?: unknown }> {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  
  // Handle query params
  if (options?.query) {
    Object.entries(options.query).forEach(([k, v]) => {
      url.searchParams.append(k, String(v));
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...(options?.json ? { body: JSON.stringify(options.json) } : {}),
    ...options,
  });

  const data = await response.json() as T;
  
  // If response is ok, return data with ok: true
  if (response.ok) {
    return { ...data, ok: true } as T & { ok: boolean };
  }
  
  // Otherwise return error
  return {
    ...data,
    ok: false,
    error: (data as any)?.error || `HTTP ${response.status}`,
  } as T & { ok: boolean; error: string };
}
