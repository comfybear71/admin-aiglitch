"use client";

import { useState, useTransition } from "react";
import { createContact, deleteContact, updateContact } from "./actions";

export interface Contact {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  tags: string[];
  assigned_persona_id: string | null;
  notes: string | null;
  last_emailed_at: string | null;
  email_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialContacts: Contact[];
  allTags: string[];
}

export function ContactsClient({ initialContacts, allTags }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const onDelete = (c: Contact) => {
    if (!confirm(`Delete ${c.name ?? c.email}? This cannot be undone.`)) return;
    setErr(null);
    startTransition(async () => {
      const result = await deleteContact(c.id);
      if (!result.ok) setErr(result.error);
    });
  };

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

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setShowNew((v) => !v)}
          style={btnPrimary(isPending)}
          disabled={isPending}
        >
          {showNew ? "Cancel" : "+ New contact"}
        </button>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {initialContacts.length} contact{initialContacts.length === 1 ? "" : "s"}
          {allTags.length > 0 && (
            <>
              {" • tags: "}
              {allTags.map((t) => (
                <span key={t} style={tagPill}>
                  {t}
                </span>
              ))}
            </>
          )}
        </span>
      </div>

      {showNew && (
        <ContactForm
          mode="create"
          onDone={() => setShowNew(false)}
          onError={setErr}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {initialContacts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
            No contacts yet. Click <strong>+ New contact</strong> above.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Company</th>
                <th style={th}>Tags</th>
                <th style={th}>Last emailed</th>
                <th style={{ ...th, width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {initialContacts.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <ContactForm
                        mode="edit"
                        initial={c}
                        onDone={() => setEditingId(null)}
                        onError={setErr}
                        isPending={isPending}
                        startTransition={startTransition}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{c.name ?? <em style={{ color: "#9ca3af" }}>—</em>}</td>
                    <td style={td}>
                      <code style={{ fontSize: 13 }}>{c.email}</code>
                    </td>
                    <td style={td}>{c.company ?? <em style={{ color: "#9ca3af" }}>—</em>}</td>
                    <td style={td}>
                      {c.tags.length > 0 ? (
                        c.tags.map((t) => (
                          <span key={t} style={tagPill}>
                            {t}
                          </span>
                        ))
                      ) : (
                        <em style={{ color: "#9ca3af" }}>—</em>
                      )}
                    </td>
                    <td style={{ ...td, color: "#6b7280", fontSize: 12 }}>
                      {c.last_emailed_at
                        ? new Date(c.last_emailed_at).toLocaleDateString()
                        : "never"}
                      {c.email_count > 0 && ` (${c.email_count})`}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => setEditingId(c.id)}
                        disabled={isPending}
                        style={btnGhost(isPending)}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        disabled={isPending}
                        style={{
                          ...btnGhost(isPending),
                          borderColor: "#fecaca",
                          color: "#b91c1c",
                          marginLeft: 4,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── New / Edit form ─────────────────────────────────────────────────────

interface ContactFormProps {
  mode: "create" | "edit";
  initial?: Contact;
  onDone: () => void;
  onError: (err: string | null) => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}

function ContactForm({
  mode,
  initial,
  onDone,
  onError,
  isPending,
  startTransition,
}: ContactFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    onError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createContact({ name, email, company, tags, notes })
          : await updateContact({
              id: initial!.id,
              name,
              email,
              company,
              tags,
              notes,
            });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDone();
    });
  };

  return (
    <div
      style={{
        background: "#f9fafb",
        border: mode === "create" ? "1px solid #e5e7eb" : undefined,
        borderRadius: mode === "create" ? 8 : undefined,
        padding: 16,
        marginBottom: mode === "create" ? 16 : 0,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Andrew Example"
            style={input}
            disabled={isPending}
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="andrew@example.com"
            style={input}
            disabled={isPending}
            required
          />
        </Field>
        <Field label="Company">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            style={input}
            disabled={isPending}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="family, grants"
            style={input}
            disabled={isPending}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes — who they are, how you know them, etc."
          style={{ ...input, minHeight: 60, resize: "vertical" }}
          disabled={isPending}
        />
      </Field>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={isPending || !email.trim()} style={btnPrimary(isPending)}>
          {isPending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
        <button onClick={onDone} disabled={isPending} style={btnGhost(isPending)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Inline styles ───────────────────────────────────────────────────────

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#374151",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.3,
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const tagPill: React.CSSProperties = {
  display: "inline-block",
  background: "#e0e7ff",
  color: "#3730a3",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  marginRight: 4,
  fontWeight: 500,
};
const btnPrimary = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  border: "none",
  borderRadius: 6,
  background: disabled ? "#9ca3af" : "#111",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
});
const btnGhost = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
  fontSize: 14,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
});
