"use client";

import { AdminProvider } from "./AdminContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
