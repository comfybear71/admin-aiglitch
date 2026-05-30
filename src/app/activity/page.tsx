/**
 * Admin Activity — Combined overview + recent activity dashboard.
 *
 * Server Component gates the route via the cookie check, then hands
 * off to the client `ActivityClient` for rendering the condensed
 * overview + recent activity view.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server";
import ActivityClient from "./activity-client";

export default async function AdminActivity() {
  const ok = await isAdminAuthenticatedServer();
  if (!ok) redirect("/login");

  return <ActivityClient />;
}
