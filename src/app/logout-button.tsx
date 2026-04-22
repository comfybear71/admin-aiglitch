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
      style={{
        padding: "6px 12px",
        border: "1px solid #d1d5db",
        borderRadius: 6,
        background: "#fff",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
