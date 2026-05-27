"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/admin", { method: "DELETE" });
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
