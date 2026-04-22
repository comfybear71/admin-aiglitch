/**
 * Prompts — admin prompt overrides.
 *
 * Editable catalog of DB prompt overrides. `getPrompt(cat, key, default)`
 * calls across the backend pick up whatever you save here immediately.
 *
 * Static catalogs (channels, directors, genres, platform) aren't ported
 * from the legacy repo yet — the backend returns a `deferred` block we
 * surface as a warning so you know what's missing.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";
import { PromptsClient, type PromptOverride } from "./prompts-client";

interface PromptsResponse {
  overrides: PromptOverride[];
  overrideCount: number;
  deferred?: {
    note: string;
    sections: string[];
  };
}

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/login");

  const res = await apiFetch<PromptsResponse>("/api/admin/prompts");

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <header style={{ marginBottom: 8 }}>
        <Link
          href="/"
          style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}
        >
          ← Admin home
        </Link>
        <h1 style={{ margin: "4px 0 0" }}>Prompts</h1>
      </header>
      <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Prompt overrides — stored in the DB, picked up by every{" "}
        <code>getPrompt(category, key, default)</code> call on the backend.
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
          <strong>Couldn&apos;t load prompts:</strong> {res.error}
        </div>
      ) : (
        <>
          {res.data?.deferred && res.data.deferred.sections.length > 0 && (
            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fde047",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 13,
                color: "#713f12",
              }}
            >
              <strong>Heads up:</strong> {res.data.deferred.note}
            </div>
          )}
          <PromptsClient overrides={res.data?.overrides ?? []} />
        </>
      )}
    </main>
  );
}
