"use client";

import { useMemo, useState, useTransition } from "react";
import { resetPrompt, savePrompt } from "./actions";

export interface PromptOverride {
  id: number;
  category: string;
  key: string;
  label: string;
  value: string;
  updated_at: string;
}

interface Props {
  overrides: PromptOverride[];
}

export function PromptsClient({ overrides }: Props) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, PromptOverride[]>();
    for (const o of overrides) {
      const arr = map.get(o.category) ?? [];
      arr.push(o);
      map.set(o.category, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [overrides]);

  const onReset = (o: PromptOverride) => {
    if (
      !confirm(
        `Reset "${o.category}/${o.key}" back to default? The DB override will be deleted.`,
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const result = await resetPrompt({ category: o.category, key: o.key });
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

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setShowNew((v) => !v)}
          style={btnPrimary(isPending)}
          disabled={isPending}
        >
          {showNew ? "Cancel" : "+ New override"}
        </button>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {overrides.length} override{overrides.length === 1 ? "" : "s"}
          {grouped.length > 0 && ` • ${grouped.length} categor${grouped.length === 1 ? "y" : "ies"}`}
        </span>
      </div>

      {showNew && (
        <PromptForm
          mode="create"
          onDone={() => setShowNew(false)}
          onError={setErr}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {grouped.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 32,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No overrides yet. Click <strong>+ New override</strong> above to
          create one.
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} style={{ marginBottom: 24 }}>
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
              {category}
            </h2>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {items.map((o, idx) =>
                editingId === o.id ? (
                  <div
                    key={o.id}
                    style={{
                      borderBottom:
                        idx < items.length - 1 ? "1px solid #f3f4f6" : undefined,
                    }}
                  >
                    <PromptForm
                      mode="edit"
                      initial={o}
                      onDone={() => setEditingId(null)}
                      onError={setErr}
                      isPending={isPending}
                      startTransition={startTransition}
                    />
                  </div>
                ) : (
                  <div
                    key={o.id}
                    style={{
                      padding: 12,
                      borderBottom:
                        idx < items.length - 1 ? "1px solid #f3f4f6" : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <code
                          style={{
                            fontSize: 13,
                            background: "#f3f4f6",
                            padding: "2px 6px",
                            borderRadius: 3,
                            color: "#374151",
                          }}
                        >
                          {o.key}
                        </code>
                        {o.label && o.label !== o.key && (
                          <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 13 }}>
                            {o.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => setEditingId(o.id)}
                          disabled={isPending}
                          style={btnGhost(isPending)}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onReset(o)}
                          disabled={isPending}
                          style={{
                            ...btnGhost(isPending),
                            borderColor: "#fecaca",
                            color: "#b91c1c",
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 6,
                        padding: 10,
                        fontFamily: "ui-monospace, Menlo, monospace",
                        fontSize: 12,
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: 180,
                        overflow: "auto",
                      }}
                    >
                      {o.value}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
                      Updated {new Date(o.updated_at).toLocaleString()}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        ))
      )}
    </>
  );
}

// ─── Create / Edit form ─────────────────────────────────────────────────

interface PromptFormProps {
  mode: "create" | "edit";
  initial?: PromptOverride;
  onDone: () => void;
  onError: (err: string | null) => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}

function PromptForm({
  mode,
  initial,
  onDone,
  onError,
  isPending,
  startTransition,
}: PromptFormProps) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [value, setValue] = useState(initial?.value ?? "");

  const submit = () => {
    onError(null);
    startTransition(async () => {
      const result = await savePrompt({ category, key, label, value });
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="platform"
            style={input}
            disabled={isPending || mode === "edit"}
          />
        </Field>
        <Field label="Key">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="brief"
            style={input}
            disabled={isPending || mode === "edit"}
          />
        </Field>
        <Field label="Label (optional)">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Platform Brief"
            style={input}
            disabled={isPending}
          />
        </Field>
      </div>
      <Field label="Value">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Prompt content — supports multi-line text."
          style={{
            ...input,
            minHeight: 140,
            resize: "vertical",
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 13,
          }}
          disabled={isPending}
        />
      </Field>
      {mode === "edit" && (
        <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>
          Category + key are immutable on edit — create a new override if you
          need different keys, or Reset this one and create fresh.
        </p>
      )}
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={submit}
          disabled={isPending || !category.trim() || !key.trim()}
          style={btnPrimary(isPending)}
        >
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

// ─── Inline styles ──────────────────────────────────────────────────────

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "inherit",
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
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
  fontSize: 13,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
});
