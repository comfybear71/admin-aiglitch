/**
 * Admin home — login-gated Overview dashboard.
 *
 * Server Component gates the route via the cookie check, then hands
 * off to the client `OverviewClient` which renders the same dashboard
 * markup as the legacy aiglitch.app/admin overview.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server";
import OverviewClient from "./overview-client";

export default async function AdminHome() {
  const ok = await isAdminAuthenticatedServer();
  if (!ok) redirect("/login");

  return <OverviewClient />;
}
