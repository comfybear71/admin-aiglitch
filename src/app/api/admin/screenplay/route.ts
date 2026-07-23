/**
 * Long-timeout passthrough for POST /api/admin/screenplay.
 *
 * next.config beforeFiles rewrites can return plain "Internal Server Error"
 * when Claude/Grok screenplay generation exceeds the dev-proxy buffer window
 * (~30s). This route forwards to api.aiglitch.app (or API_PROXY_TARGET) with
 * a 5-minute client timeout so channel video generation can finish Phase 1.
 */

import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const API_ORIGIN =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "https://api.aiglitch.app";

const UPSTREAM_TIMEOUT_MS = 300_000;

function forwardCookie(request: NextRequest): string {
  return request.headers.get("cookie") ?? "";
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const upstream = await fetch(`${API_ORIGIN}/api/admin/screenplay`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        cookie: forwardCookie(request),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Screenplay proxy failed: ${msg}. Is aiglitch-api running? Set API_PROXY_TARGET=http://localhost:3000 when testing locally.`,
      },
      { status: 502 },
    );
  }
}
