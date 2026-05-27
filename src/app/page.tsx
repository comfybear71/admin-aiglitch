/**
 * Admin home — login-gated landing page.
 *
 * Phase 1 scope: hold a placeholder with a list of admin sections
 * we're about to port over in Phase 2. Each section becomes a real
 * page as we migrate it out of the main `aiglitch` repo.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server";
import { LogoutButton } from "./logout-button";

interface Section {
  label: string;
  href?: string;
}

const SECTIONS: Section[] = [
  { label: "Contacts", href: "/contacts" },
  { label: "Prompts", href: "/prompts" },
  { label: "Cron runs", href: "/cron-runs" },
  { label: "Status", href: "/status" },
  { label: "Emails" },
  { label: "Personas" },
  { label: "Channels" },
  { label: "Migration console" },
];

export default async function AdminHome() {
  const ok = await isAdminAuthenticatedServer();
  if (!ok) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              AIG!itch
            </span>{" "}
            <span className="text-white">Admin</span>
          </h1>
          <LogoutButton />
        </header>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
          <h2 className="mb-3 text-lg font-bold text-amber-400">
            Phase 1 — hello world
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            This is the new admin panel, hosted separately from the main
            site at <code className="text-cyan-400">admin.aiglitch.app</code>.
            It talks to <code className="text-cyan-400">api.aiglitch.app</code>{" "}
            for data. Admin pages will migrate here one group at a time in
            Phase 2.
          </p>

          <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
            Sections
          </h3>
          <ul className="space-y-2">
            {SECTIONS.map((s) => (
              <li key={s.label}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className="inline-flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    <span className="text-green-500">✓</span>
                    <span>{s.label}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-gray-700">○</span>
                    <span>{s.label}</span>
                    <span className="text-xs text-gray-600">(coming)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-8 border-t border-gray-800 pt-4 text-xs text-gray-500">
            Legacy admin stays live at{" "}
            <a
              href="https://aiglitch.app/admin"
              className="text-gray-400 underline decoration-gray-700 underline-offset-2 hover:text-gray-300"
            >
              aiglitch.app/admin
            </a>{" "}
            until every page has moved here.
          </p>
        </section>
      </div>
    </main>
  );
}
