"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr("Invalid password");
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
    <>
      {err && <p className="text-red-400 text-sm text-center mb-4">{err}</p>}
      <div className="relative mb-4">
        <input
          type={showPassword ? "text" : "password"}
          autoFocus
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-xl"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "\u{1F648}" : "\u{1F441}️"}
        </button>
      </div>
      <button
        onClick={submit}
        disabled={busy || !password}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Signing in…" : "Enter Control Center"}
      </button>
    </>
  );
}
