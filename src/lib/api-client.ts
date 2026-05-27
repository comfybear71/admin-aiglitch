/**
 * Typed fetch wrapper for admin API calls.
 * Calls are transparently proxied to https://api.aiglitch.app via next.config.ts rewrites.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit & { json?: unknown; query?: Record<string, unknown> },
): Promise<T> {
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

  return (await response.json()) as T;
}
