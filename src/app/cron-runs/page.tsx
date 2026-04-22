/**
 * Cron runs — dashboard of scheduled jobs + manual trigger + history.
 *
 * Pulls the combined payload from `/api/admin/cron-control`:
 *   • 24h stats (total / successful / failed / cost)
 *   • Registered cron jobs with their last-run status
 *   • Recent 100-row execution history
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";
import { CronRunsClient, type CronJob, type HistoryRow, type Stats24h } from "./cron-runs-client";

interface CronControlResponse {
  cron_jobs: CronJob[];
  stats_24h: Stats24h;
  recent_history: HistoryRow[];
}

export const dynamic = "force-dynamic";

export default async function CronRunsPage() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/login");

  const res = await apiFetch<CronControlResponse>("/api/admin/cron-control");

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 24 }}>
      <header style={{ marginBottom: 8 }}>
        <Link
          href="/"
          style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}
        >
          ← Admin home
        </Link>
        <h1 style={{ margin: "4px 0 0" }}>Cron runs</h1>
      </header>
      <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Scheduled jobs — last-run status, 24h totals, manual trigger, and
        recent history.
      </p>

      {!res.ok ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 16,
            color: "#991b1b",
          }}
        >
          <strong>Couldn&apos;t load cron dashboard:</strong> {res.error}
        </div>
      ) : (
        <CronRunsClient
          cronJobs={res.data?.cron_jobs ?? []}
          stats={
            res.data?.stats_24h ?? {
              total_runs: 0,
              successful: 0,
              failed: 0,
              total_cost_usd: 0,
              unique_jobs: 0,
            }
          }
          history={res.data?.recent_history ?? []}
        />
      )}
    </main>
  );
}
