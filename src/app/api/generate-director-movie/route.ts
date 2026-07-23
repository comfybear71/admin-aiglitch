/**
 * Long-timeout passthrough for /api/generate-director-movie.
 *
 * Stitch downloads 8 clips (~40–70MB), concatenates, uploads to Blob, and
 * inserts the feed post — often 60–120s. The next.config rewrite hits the
 * ~30s dev-proxy cap and returns plain "Internal Server Error".
 *
 * GET forwards spread_status polls after background social spread.
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

async function forwardResponse(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(
      `${API_ORIGIN}/api/generate-director-movie${request.nextUrl.search}`,
      {
        headers: { cookie: forwardCookie(request) },
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      },
    );
    return forwardResponse(upstream);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Stitch status proxy failed: ${msg}` }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: BodyInit;

    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = await request.text();
    }

    const upstream = await fetch(`${API_ORIGIN}/api/generate-director-movie`, {
      method: "POST",
      headers: {
        ...(contentType.includes("multipart/form-data")
          ? { cookie: forwardCookie(request) }
          : {
              "content-type": contentType || "application/json",
              cookie: forwardCookie(request),
            }),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    return forwardResponse(upstream);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Stitch proxy failed: ${msg}. Ensure aiglitch-api is running and API_PROXY_TARGET=http://localhost:3000`,
      },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.text();
    const upstream = await fetch(`${API_ORIGIN}/api/generate-director-movie`, {
      method: "PATCH",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        cookie: forwardCookie(request),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return forwardResponse(upstream);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Stitch PATCH proxy failed: ${msg}` }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.text();
    const upstream = await fetch(`${API_ORIGIN}/api/generate-director-movie`, {
      method: "PUT",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        cookie: forwardCookie(request),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return forwardResponse(upstream);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Stitch PUT proxy failed: ${msg}` }, { status: 502 });
  }
}
