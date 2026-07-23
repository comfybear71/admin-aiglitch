/**
 * Streaming passthrough for POST /api/admin/hatchery.
 *
 * next.config rewrites buffer the full response before the browser sees
 * any bytes — fine for JSON, breaks NDJSON hatch progress. This route
 * pipes the upstream ReadableStream through so steps render live.
 *
 * GET still proxies JSON (list hatchlings) without buffering issues.
 */

import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_ORIGIN =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "https://api.aiglitch.app";

function forwardCookie(request: NextRequest): string {
  return request.headers.get("cookie") ?? "";
}

export async function GET(request: NextRequest) {
  const upstream = await fetch(
    `${API_ORIGIN}/api/admin/hatchery${request.nextUrl.search}`,
    {
      headers: { cookie: forwardCookie(request) },
      cache: "no-store",
    },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const upstream = await fetch(`${API_ORIGIN}/api/admin/hatchery`, {
    method: "POST",
    headers: {
      "content-type":
        request.headers.get("content-type") ?? "application/json",
      cookie: forwardCookie(request),
    },
    body,
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  // Explicit chunk pump — some Next dev setups buffer `upstream.body` passthrough.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
