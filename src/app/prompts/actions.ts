"use server";

/**
 * Server actions for the Prompts page.
 *
 * Backend exposes two actions (no PATCH/DELETE):
 *   - `save`  → upsert by (category, key)
 *   - `reset` → delete the override (content generators fall back to the
 *               hardcoded default)
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

export async function savePrompt(input: {
  category: string;
  key: string;
  label?: string;
  value: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth) return auth;

  const category = input.category.trim();
  const key = input.key.trim();
  if (!category || !key) return { ok: false, error: "category + key required" };
  if (input.value === undefined) return { ok: false, error: "value required" };

  const res = await apiFetch("/api/admin/prompts", {
    method: "POST",
    json: {
      action: "save",
      category,
      key,
      label: input.label?.trim() || key,
      value: input.value,
    },
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Save failed" };
  revalidatePath("/prompts");
  return { ok: true, error: null };
}

export async function resetPrompt(input: {
  category: string;
  key: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth) return auth;
  if (!input.category || !input.key) {
    return { ok: false, error: "category + key required" };
  }

  const res = await apiFetch("/api/admin/prompts", {
    method: "POST",
    json: { action: "reset", category: input.category, key: input.key },
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Reset failed" };
  revalidatePath("/prompts");
  return { ok: true, error: null };
}
