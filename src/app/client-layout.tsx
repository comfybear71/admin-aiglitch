"use client";

import { AdminProvider } from "./AdminContext";
import { AdminShell } from "./admin-shell";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
