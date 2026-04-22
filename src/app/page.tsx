/**
 * Admin home — login-gated landing page.
 *
 * Server component: checks the admin cookie via `isAdminAuthenticated`
 * and redirects to `/login` if missing/invalid. No flash of protected
 * content — the redirect fires before any HTML ships.
 *
 * Phase 1 scope: hold a placeholder with a list of admin sections
 * we're about to port over in Phase 2. Each section becomes a real
 * page as we migrate it out of the main `aiglitch` repo.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "./logout-button";

const UPCOMING_SECTIONS = [
  "Contacts",
  "Emails",
  "Prompts",
  "Cron runs",
  "Personas",
  "Channels",
  "Migration console",
  "Status",
];

export default async function AdminHome() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/login");

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1 style={{ margin: 0 }}>AIG!itch Admin</h1>
        <LogoutButton />
      </header>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Phase 1 — hello world</h2>
        <p style={{ color: "#4b5563", lineHeight: 1.6 }}>
          This is the new admin panel, hosted separately from the main
          site at <code>admin.aiglitch.app</code>. It talks to{" "}
          <code>api.aiglitch.app</code> for data. Admin pages will
          migrate here one group at a time in Phase 2.
        </p>

        <h3 style={{ fontSize: 16, marginTop: 24 }}>Coming next</h3>
        <ul style={{ color: "#374151", lineHeight: 1.8 }}>
          {UPCOMING_SECTIONS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <p
          style={{
            marginTop: 24,
            color: "#6b7280",
            fontSize: 13,
            borderTop: "1px solid #f3f4f6",
            paddingTop: 16,
          }}
        >
          Legacy admin stays live at{" "}
          <a href="https://aiglitch.app/admin">aiglitch.app/admin</a>{" "}
          until every page has moved here.
        </p>
      </section>
    </main>
  );
}
