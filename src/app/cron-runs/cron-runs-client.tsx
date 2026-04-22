"use client";

import { useState, useTransition } from "react";
import { triggerCron } from "./actions";

export interface CronJob {
  name: string;
  endpoint: string;
  method: string;
  schedule: string;
  description: string;
  last_status: string;
  last_run: string | null;
  last_duration_ms: number | null;
  last_cost_usd: number | null;
  last_error: string | null;
}

export interface HistoryRow {
  id: string;
  cron_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  cost_usd: string | number | null;
  error: string | null;
}

export interface Stats24h {
  total_runs: number;
  successful: number;
  failed: number;
  total_cost_usd: number;
  unique_jobs: number;
}

interface Props {
  cronJobs: CronJob[];
  stats: Stats24h;
  history: HistoryRow[];
}

export function CronRunsClient({ cronJobs, stats, history }: Props) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "error">("all");

  const onTrigger = (job: CronJob) => {
    if (
      !confirm(
        `Trigger ${job.name} now?\n\nIt will run with real side effects (DB writes, API calls, etc.).`,
      )
    )
      return;
    setErr(null);
    setBusyJob(job.name);
    startTransition(async () => {
      const result = await triggerCron(job.name);
      setBusyJob(null);
      if (!result.ok) setErr(`${job.name}: ${result.error}`);
    });
  };

  const filteredHistory = history.filter((h) => {
    if (jobFilter && h.cron_name !== jobFilter) return false;
    if (statusFilter === "ok" && h.status !== "ok") return false;
    if (statusFilter === "error" && h.status !== "error") return false;
    return true;
  });

  return (
    <>
      {err && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 12,
            color: "#991b1b",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {err}
        </div>
      )}

      {/* 24h stats strip */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
        }}
      >
        <Stat label="24h runs" value={stats.total_runs.toLocaleString()} />
        <Stat
          label="Successful"
          value={stats.successful.toLocaleString()}
          color="#16a34a"
        />
        <Stat
          label="Failed"
          value={stats.failed.toLocaleString()}
          color={stats.failed > 0 ? "#dc2626" : "#6b7280"}
        />
        <Stat
          label="Jobs run"
          value={stats.unique_jobs.toLocaleString()}
          hint={`of ${cronJobs.length} registered`}
        />
        <Stat
          label="Cost"
          value={`$${stats.total_cost_usd.toFixed(2)}`}
        />
      </div>

      {/* Cron job cards */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 8,
        }}
      >
        Registered jobs ({cronJobs.length})
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {cronJobs.map((job) => (
          <div
            key={job.name}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <div>
                <code
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  {job.name}
                </code>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {job.schedule} · <code>{job.method} {job.endpoint}</code>
                </div>
              </div>
              <StatusPill status={job.last_status} />
            </div>
            <p style={{ fontSize: 13, color: "#4b5563", margin: "6px 0" }}>
              {job.description}
            </p>
            <div
              style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}
            >
              {job.last_run ? (
                <>
                  Last run {new Date(job.last_run).toLocaleString()}
                  {job.last_duration_ms != null && (
                    <> · {(job.last_duration_ms / 1000).toFixed(1)}s</>
                  )}
                  {job.last_cost_usd != null && job.last_cost_usd > 0 && (
                    <> · ${job.last_cost_usd.toFixed(3)}</>
                  )}
                </>
              ) : (
                <em>Never run</em>
              )}
            </div>
            {job.last_error && (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#991b1b",
                  maxHeight: 80,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "ui-monospace, Menlo, monospace",
                }}
              >
                {job.last_error}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => onTrigger(job)}
                disabled={isPending}
                style={btnGhost(isPending)}
              >
                {busyJob === job.name ? "Triggering…" : "Trigger now"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 8,
        }}
      >
        Recent history ({history.length})
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All jobs</option>
          {cronJobs.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={selectStyle}
        >
          <option value="all">All statuses</option>
          <option value="ok">Successful</option>
          <option value="error">Errors only</option>
        </select>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {filteredHistory.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
            No history matches your filters.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}
              >
                <th style={th}>When</th>
                <th style={th}>Job</th>
                <th style={th}>Status</th>
                <th style={th}>Duration</th>
                <th style={th}>Cost</th>
                <th style={{ ...th, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h) => (
                <>
                  <tr
                    key={h.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      cursor: h.error ? "pointer" : "default",
                    }}
                    onClick={() => h.error && setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <td style={td}>{new Date(h.started_at).toLocaleString()}</td>
                    <td style={td}>
                      <code style={{ fontSize: 12 }}>{h.cron_name}</code>
                    </td>
                    <td style={td}>
                      <StatusPill status={h.status} />
                    </td>
                    <td style={td}>
                      {h.duration_ms != null
                        ? `${(h.duration_ms / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td style={td}>
                      {h.cost_usd != null && Number(h.cost_usd) > 0
                        ? `$${Number(h.cost_usd).toFixed(3)}`
                        : "—"}
                    </td>
                    <td style={td}>
                      {h.error && (
                        <span style={{ color: "#6b7280", fontSize: 12 }}>
                          {expandedId === h.id ? "▼" : "▶"} error
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedId === h.id && h.error && (
                    <tr key={`${h.id}-err`}>
                      <td
                        colSpan={6}
                        style={{
                          padding: 12,
                          background: "#fef2f2",
                          borderBottom: "1px solid #fecaca",
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "#991b1b",
                            whiteSpace: "pre-wrap",
                            fontFamily: "ui-monospace, Menlo, monospace",
                          }}
                        >
                          {h.error}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function Stat({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: color ?? "#111",
          marginTop: 2,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 11, color: "#9ca3af" }}>{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    ok: { bg: "#dcfce7", fg: "#166534", label: "ok" },
    error: { bg: "#fee2e2", fg: "#991b1b", label: "error" },
    running: { bg: "#dbeafe", fg: "#1e40af", label: "running" },
    never_run: { bg: "#f3f4f6", fg: "#6b7280", label: "never" },
  };
  const entry = map[status] ?? { bg: "#f3f4f6", fg: "#6b7280", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        background: entry.bg,
        color: entry.fg,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {entry.label}
    </span>
  );
}

// ─── Inline styles ──────────────────────────────────────────────────────

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#374151",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.3,
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};
const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  background: "#fff",
};
const btnGhost = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
  fontSize: 13,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
});
