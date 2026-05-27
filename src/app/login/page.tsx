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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{"\u{1F512}"}</div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            AIG!itch Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">Control Center</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
