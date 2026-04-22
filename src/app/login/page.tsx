/**
 * Login page — the only unauthenticated route.
 *
 * If you're already logged in, we redirect you straight to `/`.
 * Otherwise: password form, POST to `/api/auth/admin`, redirect on
 * success. Same HMAC auth contract as aiglitch-api — setting
 * `ADMIN_PASSWORD` to the same value on both Vercel projects gives
 * you one password for the whole ecosystem.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const ok = await isAdminAuthenticated();
  if (ok) redirect("/");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 28,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 4, fontSize: 22 }}>
          AIG!itch Admin
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: 13,
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          Enter the admin password. Session lasts 7 days.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
