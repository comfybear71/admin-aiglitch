"use server";

/**
 * Server actions for the Contacts page.
 *
 * Each action checks admin auth locally, then proxies to
 * `api.aiglitch.app/api/admin/contacts` via the shared `apiFetch`
 * helper. All mutations call `revalidatePath("/contacts")` so the
 * server-rendered list is fresh after a write.
 */

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { apiFetch } from "@/lib/api-client";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

async function requireAdmin(): Promise<ActionResult | null> {
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Not logged in as admin" };
  }
  return null;
}

export async function createContact(input: {
  name: string;
  email: string;
  company?: string;
  tags?: string[];
  notes?: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth) return auth;

  const email = input.email.trim();
  if (!email) return { ok: false, error: "Email required" };

  const res = await apiFetch("/api/admin/contacts", {
    method: "POST",
    json: {
      name: input.name.trim() || null,
      email,
      company: input.company?.trim() || null,
      tags: input.tags ?? [],
      notes: input.notes?.trim() || null,
    },
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Create failed" };
  revalidatePath("/contacts");
  return { ok: true, error: null };
}

export async function updateContact(input: {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth) return auth;
  if (!input.id) return { ok: false, error: "Contact id required" };

  const res = await apiFetch("/api/admin/contacts", {
    method: "PATCH",
    json: input,
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Update failed" };
  revalidatePath("/contacts");
  return { ok: true, error: null };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth) return auth;
  if (!id) return { ok: false, error: "Contact id required" };

  const res = await apiFetch("/api/admin/contacts", {
    method: "DELETE",
    query: { id },
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Delete failed" };
  revalidatePath("/contacts");
  return { ok: true, error: null };
}
