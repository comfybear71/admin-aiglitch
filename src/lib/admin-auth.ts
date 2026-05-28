/**
 * Admin Authentication — Client-Safe Version
 * ===========================================
 * For admin-aiglitch UI only. No server-side dependencies.
 * Cookie is set by /api/auth/admin route on the backend.
 */

/**
export const ADMIN_COOKIE = "aiglitch-admin-token";   //ME CHANGED
*/


/**
 * Check if admin cookie exists (client-side check).
 * Note: This doesn't validate the cookie value; it just checks presence.
 * The backend validates the token when you call protected /api/admin/* routes.
 */


//ME CHANGED
/**
export function isAdminAuthenticated(): boolean {
  if (typeof document === "undefined") return false; // Server-side
  const cookies = document.cookie.split(";").map(c => c.trim());
  return cookies.some(c => c.startsWith(`${ADMIN_COOKIE}=`));
}
*/



/** Dummy function for compatibility */
/**
export function safeEqual(a: string, b: string): boolean {
  return a === b;
}
*/

/** Dummy function for compatibility */
/**
export function generateToken(password: string): string {
  return password;
}
*/
/**
export const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
*/


/**
 * Admin Authentication — Client Utilities Only
 * ============================================
 * This file should ONLY be imported in Client Components ("use client").
 * Never import this in Server Components or Route Handlers.
 *
 * For Server Components, use: import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server"
 */

export const ADMIN_COOKIE = "aiglitch-admin-token";

/**
 * Client-side only check for presence of the admin cookie.
 * This does NOT validate the token — the backend does that on every /api/admin/* request.
 */
export function isAdminAuthenticatedClient(): boolean {
  if (typeof document === "undefined") {
    console.warn("isAdminAuthenticatedClient() was called on the server. Use isAdminAuthenticatedServer() instead.");
    return false;
  }

  const cookies = document.cookie.split(";").map(c => c.trim());
  return cookies.some(c => c.startsWith(`${ADMIN_COOKIE}=`));
}

// Keep the old name as an alias for now (for backward compatibility during migration)
export const isAdminAuthenticated = isAdminAuthenticatedClient;

// These are intentionally left as dummies in the client file.
// Real token generation/validation happens in aiglitch-api.
// We will clean these up properly in a follow-up PR.
export function safeEqual(a: string, b: string): boolean {
  return a === b;
}

export function generateToken(password: string): string {
  return password;
}

export const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days


