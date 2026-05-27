import { cookies } from "next/headers";

const ADMIN_COOKIE = "aiglitch-admin-token";

/**
 * Server-only auth check. Only validates cookie PRESENCE, not the
 * HMAC token itself. Backend (api.aiglitch.app) validates the HMAC
 * on every /api/admin/* call, so an invalid cookie just means all
 * data fetches return 401. Acceptable MVP; tighter validation
 * needs a /api/auth/admin/validate endpoint on aiglitch-api as a
 * future PR.
 */
export async function isAdminAuthenticatedServer(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return Boolean(token);
}
