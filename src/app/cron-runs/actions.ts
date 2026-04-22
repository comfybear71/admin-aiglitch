"use server";

/**
 * Server action for the Cron runs page.
 *
 * Trigger button fires POST `/api/admin/cron-control` with `{ job }`.
 * When the downstream cron itself errors, we surface the HTTP status
 * + the cron's response body so the dashboard shows what actually
 * broke rather than a generic "cron responded with an error".
 */

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";

interface TriggerResponse {
  success: boolean;
  job: string;
  endpoint?: string;
  status?: number;
  error?: string;
  result?: unknown;
}

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

export async function triggerCron(job: string): Promise<ActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Not logged in as admin" };
  }
  if (!job) return { ok: false, error: "Missing job name" };

  const res = await apiFetch<TriggerResponse>(
    "/api/admin/cron-control",
    { method: "POST", json: { job } },
  );

  // Network / auth error before the cron even ran
  if (!res.ok) return { ok: false, error: res.error ?? "Trigger failed" };

  const data = res.data;

  // Cron ran but returned non-2xx. The backend packages the cron's
  // response body as `result` and its HTTP status as `status`. Surface
  // both so you can see what actually broke.
  if (data && data.success === false) {
    const parts: string[] = [];
    if (data.status) parts.push(`HTTP ${data.status}`);
    if (data.error) parts.push(data.error);

    // Best-effort extraction of a human-readable message from the
    // cron's own response body. Handles the common shapes:
    //   { error: "..." }, { message: "..." }, string, or anything else
    //   (fallback to JSON.stringify, truncated).
    if (data.result !== undefined && data.result !== null) {
      const result = data.result as Record<string, unknown> | string;
      if (typeof result === "string") {
        parts.push(result);
      } else if (typeof result === "object") {
        const r = result as Record<string, unknown>;
        if (typeof r.error === "string") parts.push(r.error);
        else if (typeof r.message === "string") parts.push(r.message);
        else {
          const snippet = JSON.stringify(result).slice(0, 300);
          parts.push(snippet);
        }
      }
    }

    return {
      ok: false,
      error: parts.length > 0 ? parts.join(" — ") : "Cron responded with an error",
    };
  }

  revalidatePath("/cron-runs");
  return { ok: true, error: null };
}
