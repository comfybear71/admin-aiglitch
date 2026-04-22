/**
 * POST   /api/auth/admin — password login, sets HMAC cookie on success.
 * DELETE /api/auth/admin — logout, clears cookie.
 *
 * Same HMAC algorithm as `aiglitch-api`'s auth route, so setting
 * `ADMIN_PASSWORD` to the same value on both Vercel projects means
 * you have one password for the whole ecosystem.
 *
 * 7-day cookie, httpOnly, secure in production, SameSite=Lax.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
  generateToken,
  safeEqual,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const GENERIC_ERROR = "Invalid credentials";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password: unknown }).password
      : undefined;

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("[auth/admin] ADMIN_PASSWORD env var not set");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!safeEqual(password, adminPassword)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const token = generateToken(adminPassword);
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
