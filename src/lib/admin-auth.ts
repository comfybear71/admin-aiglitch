/**
 * Admin Authentication — Client Utilities
 * =======================================
 *
 * This file is intended **only** for Client Components ("use client").
 *
 * Never import from this file in:
 * - Server Components
 * - Route Handlers
 * - Server-only modules
 *
 * For Server Components, always use:
 *   import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server"
 */

export const ADMIN_COOKIE = "aiglitch-admin-token";

/**
 * Client-side only check for the presence of the admin auth cookie.
 *
 * This function does **not** validate the token. The backend
 * (`aiglitch-api`) validates the token on every protected `/api/admin/*` request.
 *
 * If this function is accidentally called on the server, it will log a warning
 * and return `false`.
 */
export function isAdminAuthenticatedClient(): boolean {
  if (typeof document === "undefined") {
    console.warn(
      "isAdminAuthenticatedClient() was called on the server. " +
        "Use isAdminAuthenticatedServer() from @/lib/admin-auth.server instead."
    );
    return false;
  }

  const cookies = document.cookie.split(";").map((c) => c.trim());
  return cookies.some((c) => c.startsWith(`${ADMIN_COOKIE}=`));
}

/**
 * Alias kept for backward compatibility during the migration.
 * Prefer using `isAdminAuthenticatedClient` explicitly in new client code.
 */
export const isAdminAuthenticated = isAdminAuthenticatedClient;

/**
 * Temporary dummy implementations.
 *
 * These exist only to keep the login route working during the transition.
 * The real HMAC-based token generation and validation lives in `aiglitch-api`.
 *
 * TODO: Remove these once proper shared auth logic is implemented
 *       (planned for a follow-up PR).
 */
export function safeEqual(a: string, b: string): boolean {
  return a === b;
}

export function generateToken(password: string): string {
  return password;
}

export const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
