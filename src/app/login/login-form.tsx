"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr("Invalid credentials");
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <input
        type="password"
        autoFocus
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      {err && (
        <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "none",
          borderRadius: 6,
          background: busy || !password ? "#9ca3af" : "#111",
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: busy || !password ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
