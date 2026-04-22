/**
 * Contacts — first migrated admin page.
 *
 * Server component: checks admin auth, fetches the contact list via
 * the shared `apiFetch` helper (server-to-server call to
 * `api.aiglitch.app/api/admin/contacts`), then hands off to the
 * client table which handles add/edit/delete via server actions.
 *
 * Replaces `/admin/contacts` on the main site — once this page is
 * stable, the legacy version can be deleted.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";
import { ContactsClient, type Contact } from "./contacts-client";

interface ContactsResponse {
  total: number;
  contacts: Contact[];
  all_tags: string[];
}

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/login");

  const res = await apiFetch<ContactsResponse>("/api/admin/contacts");

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <Link
            href="/"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            ← Admin home
          </Link>
          <h1 style={{ margin: "4px 0 0" }}>Contacts</h1>
        </div>
      </header>
      <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Outreach contact list — used by persona Telegram email campaigns.
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
          <strong>Couldn&apos;t load contacts:</strong> {res.error}
          <div style={{ marginTop: 8, fontSize: 13, color: "#7f1d1d" }}>
            Check that <code>ADMIN_PASSWORD</code> on{" "}
            <code>admin-aiglitch</code> matches the one on{" "}
            <code>aiglitch-api</code>, and that{" "}
            <code>NEXT_PUBLIC_API_BASE</code> points to your live API.
          </div>
        </div>
      ) : (
        <ContactsClient
          initialContacts={res.data?.contacts ?? []}
          allTags={res.data?.all_tags ?? []}
        />
      )}
    </main>
  );
}
