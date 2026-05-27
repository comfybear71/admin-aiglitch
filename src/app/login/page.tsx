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
import { isAdminAuthenticatedServer } from "@/lib/admin-auth.server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const ok = await isAdminAuthenticatedServer();
  if (ok) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-7">
        <h1 className="mb-1 text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            AIG!itch
          </span>{" "}
          <span className="text-white">Admin</span>
        </h1>
        <p className="mb-6 text-xs text-gray-400">
          Enter the admin password. Session lasts 7 days.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
