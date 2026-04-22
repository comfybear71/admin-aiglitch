"use server";

/**
 * Server action for the Cron runs page.
 *
 * Trigger button fires POST `/api/admin/cron-control` with `{ job }`.
 * No rate-limit here — server-side auth check is enough; you're the
 * only person with the admin cookie.
 */

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

export async function triggerCron(job: string): Promise<ActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Not logged in as admin" };
  }
  if (!job) return { ok: false, error: "Missing job name" };

  const res = await apiFetch<{ success: boolean; error?: string }>(
    "/api/admin/cron-control",
    { method: "POST", json: { job } },
  );
  if (!res.ok) return { ok: false, error: res.error ?? "Trigger failed" };
  if (res.data && res.data.success === false) {
    return { ok: false, error: res.data.error ?? "Cron responded with an error" };
  }
  revalidatePath("/cron-runs");
  return { ok: true, error: null };
}
