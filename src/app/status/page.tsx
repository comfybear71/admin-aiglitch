/**
 * Status — live health check against the 5 external services
 * aiglitch-api depends on (DB, Redis, Solana, Anthropic, xAI).
 *
 * Server component: fetches fresh on every request (force-dynamic,
 * no cache). Refresh = reload the page.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";
import { RefreshButton } from "./refresh-button";

interface ServiceCheck {
  status: "ok" | "error";
  latency_ms: number;
  message: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  checked_at: string;
  services: Record<string, ServiceCheck>;
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  database: "Neon Postgres — core data store",
  redis: "Upstash Redis — cache + circuit breaker state",
  solana: "Helius RPC — persona wallets + §GLITCH token",
  anthropic: "Anthropic API — Claude persona replies",
  xai: "xAI API — Grok persona replies + video gen",
};

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/login");

  const res = await apiFetch<HealthResponse>("/api/admin/health");

  const bannerBg =
    !res.ok || res.data?.status === "degraded" ? "#fefce8" : "#f0fdf4";
  const bannerBorder =
    !res.ok || res.data?.status === "degraded" ? "#fde047" : "#bbf7d0";
  const bannerColor =
    !res.ok || res.data?.status === "degraded" ? "#713f12" : "#166534";

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <header style={{ marginBottom: 8 }}>
        <Link
          href="/"
          style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}
        >
          ← Admin home
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <h1 style={{ margin: 0 }}>Status</h1>
          <RefreshButton />
        </div>
      </header>
      <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Live health check — pings every external service the backend
        depends on.
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
          <strong>Couldn&apos;t reach health endpoint:</strong> {res.error}
          <div style={{ marginTop: 6, fontSize: 13, color: "#7f1d1d" }}>
            If this persists, the aiglitch-api deployment itself might be
            down. Check Vercel → aiglitch-api → Deployments.
          </div>
        </div>
      ) : (
        res.data && (
          <>
            <div
              style={{
                background: bannerBg,
                border: `1px solid ${bannerBorder}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                color: bannerColor,
              }}
            >
              <strong style={{ fontSize: 16 }}>
                {res.data.status === "ok"
                  ? "✅ All systems operational"
                  : "⚠️ Degraded — one or more services failing"}
              </strong>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                Checked at {new Date(res.data.checked_at).toLocaleString()}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {Object.entries(res.data.services).map(([name, check]) => (
                <ServiceCard
                  key={name}
                  name={name}
                  description={SERVICE_DESCRIPTIONS[name] ?? ""}
                  check={check}
                />
              ))}
            </div>
          </>
        )
      )}
    </main>
  );
}

function ServiceCard({
  name,
  description,
  check,
}: {
  name: string;
  description: string;
  check: ServiceCheck;
}) {
  const isOk = check.status === "ok";
  const latencyColor =
    check.latency_ms < 300
      ? "#16a34a"
      : check.latency_ms < 1000
        ? "#eab308"
        : "#dc2626";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              display: "inline-block",
              background: isOk ? "#dcfce7" : "#fee2e2",
              color: isOk ? "#166534" : "#991b1b",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {isOk ? "ok" : "error"}
          </span>
          <code
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111",
            }}
          >
            {name}
          </code>
        </div>
        {description && (
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {description}
          </div>
        )}
        {!isOk && (
          <div
            style={{
              marginTop: 6,
              padding: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 4,
              fontSize: 11,
              color: "#991b1b",
              fontFamily: "ui-monospace, Menlo, monospace",
              wordBreak: "break-all",
            }}
          >
            {check.message}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: latencyColor,
          }}
        >
          {check.latency_ms}ms
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>latency</div>
      </div>
    </div>
  );
}
