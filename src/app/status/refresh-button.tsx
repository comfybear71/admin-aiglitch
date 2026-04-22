"use client";

import { useState } from "react";

export function RefreshButton() {
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    setBusy(true);
    window.location.reload();
  };

  return (
    <button
      onClick={refresh}
      disabled={busy}
      style={{
        padding: "6px 12px",
        border: "1px solid #d1d5db",
        borderRadius: 6,
        background: "#fff",
        cursor: busy ? "wait" : "pointer",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {busy ? "Refreshing…" : "Refresh"}
    </button>
  );
}
