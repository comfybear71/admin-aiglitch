/**
 * Admin Authentication — Client-Safe Version
 * ===========================================
 * For admin-aiglitch UI only. No server-side dependencies.
 * Cookie is set by /api/auth/admin route on the backend.
 */

export const ADMIN_COOKIE = "aiglitch-admin-token";

/**
 * Check if admin cookie exists (client-side check).
 * Note: This doesn't validate the cookie value; it just checks presence.
 * The backend validates the token when you call protected /api/admin/* routes.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof document === "undefined") return false; // Server-side
  const cookies = document.cookie.split(";").map(c => c.trim());
  return cookies.some(c => c.startsWith(`${ADMIN_COOKIE}=`));
}

/** Dummy function for compatibility */
export function safeEqual(a: string, b: string): boolean {
  return a === b;
}

/** Dummy function for compatibility */
export function generateToken(password: string): string {
  return password;
}

export const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
