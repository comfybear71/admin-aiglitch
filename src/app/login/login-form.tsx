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

  const disabled = busy || !password;

  return (
    <form onSubmit={submit}>
      <input
        type="password"
        autoFocus
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-3 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      />
      {err && (
        <div className="mb-3 text-xs text-red-400">{err}</div>
      )}
      <button
        type="submit"
        disabled={disabled}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
          disabled
            ? "cursor-not-allowed bg-gray-800 text-gray-500"
            : "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:from-purple-400 hover:to-cyan-400"
        }`}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
