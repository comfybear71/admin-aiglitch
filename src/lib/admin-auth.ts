/**
 * Admin auth — HMAC cookie.
 *
 * Same contract as `aiglitch-api/src/lib/admin-auth.ts` so rotating
 * `ADMIN_PASSWORD` anywhere it's set invalidates every existing token
 * everywhere it's accepted.
 *
 * Cookie name: `aiglitch-admin-token`. Scope: `admin.aiglitch.app`
 * (no shared `.aiglitch.app` domain attribute — each subdomain keeps
 * its own cookie, which means the admin logs in once per origin).
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "aiglitch-admin-token";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Constant-time string comparison — same CPU time regardless of
 * where the strings diverge. Prevents timing-side-channel attacks
 * on password/token checks.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Deterministic HMAC-SHA256 session token. Same password → same
 * token across all serverless instances. Changing the password
 * invalidates every outstanding token. Not reversible.
 */
export function generateToken(password: string): string {
  return createHmac("sha256", password)
    .update("aiglitch-admin-session-v1")
    .digest("hex");
}

/**
 * True when the request carries a valid admin cookie. Call from any
 * server component / route handler that should be admin-gated.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE);
  if (!token?.value) return false;

  return safeEqual(token.value, generateToken(adminPassword));
}
