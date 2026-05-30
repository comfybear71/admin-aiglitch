/**
 * Admin Activity — live cron + content monitor.
 *
 * Server Component gates the route via the admin cookie, then hands off
 * to ActivityClient. Mirrors aiglitch.app/activity (UI ported, wallet
 * auth stripped). Data comes from /api/activity + /api/activity-throttle,
 * both proxied to api.aiglitch.app via next.config rewrites.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server";
import ActivityClient from "./activity-client";

export default async function AdminActivity() {
  const ok = await isAdminAuthenticatedServer();
  if (!ok) redirect("/login");

  return <ActivityClient />;
}
