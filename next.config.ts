import type { NextConfig } from "next";

/**
 * Admin panel — hosted at admin.aiglitch.app, talks to api.aiglitch.app
 * via strangler-proxy beforeFiles rewrites.
 *
 * All /api/admin/* and /api/auth/* requests transparently proxy to
 * https://api.aiglitch.app. The browser sees admin.aiglitch.app only.
 * Admin cookie (aiglitch-admin-token) auto-scopes to admin domain.
 *
 * Reason we keep this separate from the main site:
 *   • Public aiglitch.app stays small and fast (no admin code shipped).
 *   • Admin releases don't risk the consumer experience.
 *   • Admin bundle can grow freely without affecting anyone but the admin.
 */

const adminRewrites = [
  // ── Base admin routes ───────────────────────────────────────────
  { source: "/api/admin/action", destination: "https://api.aiglitch.app/api/admin/action" },
  { source: "/api/admin/animate-persona", destination: "https://api.aiglitch.app/api/admin/animate-persona" },
  { source: "/api/admin/announce", destination: "https://api.aiglitch.app/api/admin/announce" },
  { source: "/api/admin/batch-avatars", destination: "https://api.aiglitch.app/api/admin/batch-avatars" },
  { source: "/api/admin/blob-upload", destination: "https://api.aiglitch.app/api/admin/blob-upload" },
  { source: "/api/admin/breaking-news", destination: "https://api.aiglitch.app/api/admin/breaking-news" },
  { source: "/api/admin/briefing", destination: "https://api.aiglitch.app/api/admin/briefing" },
  { source: "/api/admin/budju-trading", destination: "https://api.aiglitch.app/api/admin/budju-trading" },
  { source: "/api/admin/channels", destination: "https://api.aiglitch.app/api/admin/channels" },
  { source: "/api/admin/chibify", destination: "https://api.aiglitch.app/api/admin/chibify" },
  { source: "/api/admin/coins", destination: "https://api.aiglitch.app/api/admin/coins" },
  { source: "/api/admin/costs", destination: "https://api.aiglitch.app/api/admin/costs" },
  { source: "/api/admin/cron-control", destination: "https://api.aiglitch.app/api/admin/cron-control" },
  { source: "/api/admin/cron-health", destination: "https://api.aiglitch.app/api/admin/cron-health" },
  { source: "/api/admin/director-prompts", destination: "https://api.aiglitch.app/api/admin/director-prompts" },
  { source: "/api/admin/elon-campaign", destination: "https://api.aiglitch.app/api/admin/elon-campaign" },
  // /api/admin/emails kept — still used by the Personas tab (persona email lookups)
  { source: "/api/admin/emails", destination: "https://api.aiglitch.app/api/admin/emails" },
  { source: "/api/admin/extend-video", destination: "https://api.aiglitch.app/api/admin/extend-video" },
  { source: "/api/admin/generate-og-images", destination: "https://api.aiglitch.app/api/admin/generate-og-images" },
  { source: "/api/admin/generate-persona", destination: "https://api.aiglitch.app/api/admin/generate-persona" },
  { source: "/api/admin/grokify-sponsor", destination: "https://api.aiglitch.app/api/admin/grokify-sponsor" },
  { source: "/api/admin/hatch-admin", destination: "https://api.aiglitch.app/api/admin/hatch-admin" },
  { source: "/api/admin/hatchery", destination: "https://api.aiglitch.app/api/admin/hatchery" },
  { source: "/api/admin/health", destination: "https://api.aiglitch.app/api/admin/health" },
  { source: "/api/admin/init-persona", destination: "https://api.aiglitch.app/api/admin/init-persona" },
  { source: "/api/admin/meatlab", destination: "https://api.aiglitch.app/api/admin/meatlab" },
  { source: "/api/admin/media", destination: "https://api.aiglitch.app/api/admin/media" },
  { source: "/api/admin/migration", destination: "https://api.aiglitch.app/api/admin/migration" },
  { source: "/api/admin/mktg", destination: "https://api.aiglitch.app/api/admin/mktg" },
  { source: "/api/admin/nft-marketplace", destination: "https://api.aiglitch.app/api/admin/nft-marketplace" },
  { source: "/api/admin/nfts", destination: "https://api.aiglitch.app/api/admin/nfts" },
  { source: "/api/admin/persona-avatar", destination: "https://api.aiglitch.app/api/admin/persona-avatar" },
  { source: "/api/admin/personas", destination: "https://api.aiglitch.app/api/admin/personas" },
  { source: "/api/admin/posts", destination: "https://api.aiglitch.app/api/admin/posts" },
  { source: "/api/admin/prompts", destination: "https://api.aiglitch.app/api/admin/prompts" },
  { source: "/api/admin/prompts/pipelines", destination: "https://api.aiglitch.app/api/admin/prompts/pipelines" },
  { source: "/api/admin/promote-glitchcoin", destination: "https://api.aiglitch.app/api/admin/promote-glitchcoin" },
  { source: "/api/admin/settings", destination: "https://api.aiglitch.app/api/admin/settings" },
  { source: "/api/admin/snapshot", destination: "https://api.aiglitch.app/api/admin/snapshot" },
  { source: "/api/admin/sponsor-clip", destination: "https://api.aiglitch.app/api/admin/sponsor-clip" },
  { source: "/api/admin/sponsors", destination: "https://api.aiglitch.app/api/admin/sponsors" },
  { source: "/api/admin/spread", destination: "https://api.aiglitch.app/api/admin/spread" },
  { source: "/api/admin/stats", destination: "https://api.aiglitch.app/api/admin/stats" },
  { source: "/api/admin/swaps", destination: "https://api.aiglitch.app/api/admin/swaps" },
  { source: "/api/admin/telegram", destination: "https://api.aiglitch.app/api/admin/telegram" },
  { source: "/api/admin/tiktok-blaster", destination: "https://api.aiglitch.app/api/admin/tiktok-blaster" },
  { source: "/api/admin/token-metadata", destination: "https://api.aiglitch.app/api/admin/token-metadata" },
  { source: "/api/admin/trading", destination: "https://api.aiglitch.app/api/admin/trading" },
  { source: "/api/admin/users", destination: "https://api.aiglitch.app/api/admin/users" },
  { source: "/api/admin/wallet-auth", destination: "https://api.aiglitch.app/api/admin/wallet-auth" },
  { source: "/api/admin/x-dm", destination: "https://api.aiglitch.app/api/admin/x-dm" },

  // ── Nested subroutes (3) — kept bare above, adding :path* for nested routes ──
  { source: "/api/admin/blob-upload/:path*", destination: "https://api.aiglitch.app/api/admin/blob-upload/:path*" },
  { source: "/api/admin/sponsors/:path*", destination: "https://api.aiglitch.app/api/admin/sponsors/:path*" },
  { source: "/api/admin/telegram/:path*", destination: "https://api.aiglitch.app/api/admin/telegram/:path*" },

  // ── Multi-route endpoints — kept bare above, adding :path* for nested routes ──
  { source: "/api/admin/channels/:path*", destination: "https://api.aiglitch.app/api/admin/channels/:path*" },
  { source: "/api/admin/media/:path*", destination: "https://api.aiglitch.app/api/admin/media/:path*" },
  { source: "/api/admin/migration/:path*", destination: "https://api.aiglitch.app/api/admin/migration/:path*" },
  { source: "/api/admin/personas/:path*", destination: "https://api.aiglitch.app/api/admin/personas/:path*" },
  { source: "/api/admin/posts/:path*", destination: "https://api.aiglitch.app/api/admin/posts/:path*" },
  { source: "/api/admin/trading/:path*", destination: "https://api.aiglitch.app/api/admin/trading/:path*" },
  { source: "/api/admin/users/:path*", destination: "https://api.aiglitch.app/api/admin/users/:path*" },

  // ── Activity (admin Activity tab — ported from aiglitch.app/activity) ─
  { source: "/api/activity", destination: "https://api.aiglitch.app/api/activity" },
  { source: "/api/activity-throttle", destination: "https://api.aiglitch.app/api/activity-throttle" },

  // ── Auth endpoint ──────────────────────────────────────────────
  { source: "/api/auth/admin", destination: "https://api.aiglitch.app/api/auth/admin" },

  // ── Briefing topic generation (admin POST, cron GET) ───────────
  { source: "/api/generate-topics", destination: "https://api.aiglitch.app/api/generate-topics" },

  // ── Chaos Drops (admin manual trigger + preview) ───────────────
  { source: "/api/generate-chaos-drop", destination: "https://api.aiglitch.app/api/generate-chaos-drop" },

  // ── Channel video generation (screenplay → Grok → stitch) ───────
  // /api/admin/screenplay + /api/generate-director-movie — local route handlers (5min timeout)
  { source: "/api/test-grok-video", destination: "https://api.aiglitch.app/api/test-grok-video" },
  { source: "/api/video-proxy", destination: "https://api.aiglitch.app/api/video-proxy" },
];

const API_ORIGIN =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "https://api.aiglitch.app";
const resolvedAdminRewrites = adminRewrites.map((rule) => ({
  ...rule,
  destination: rule.destination.replace("https://api.aiglitch.app", API_ORIGIN),
}));

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // next/image remote hosts — must match aiglitch.app's whitelist so
  // persona avatars / generated media (Vercel blob, Replicate, Pexels)
  // load instead of being rejected by the optimizer.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "**.vercel-storage.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "**.replicate.delivery" },
    ],
  },
  rewrites: async () => ({
    beforeFiles: resolvedAdminRewrites,
  }),
  // ── Migrated marketing tabs ──────────────────────────────────────
  // These 9 pages moved to marketing.aiglitch.app (comfybear71/marketing-aiglitch).
  // Old admin bookmarks/deep-links redirect to their new home instead of 404ing.
  // The auth cookie is scoped to .aiglitch.app, so the user stays signed in
  // across the redirect. Temporary (307) in case any path is ever reclaimed.
  redirects: async () => [
    { source: "/sponsors", destination: "https://marketing.aiglitch.app/sponsors", permanent: false },
    { source: "/costs", destination: "https://marketing.aiglitch.app/ai-costs", permanent: false },
    { source: "/events", destination: "https://marketing.aiglitch.app/events", permanent: false },
    { source: "/campaigns", destination: "https://marketing.aiglitch.app/ad-campaigns", permanent: false },
    { source: "/x-growth", destination: "https://marketing.aiglitch.app/x-growth", permanent: false },
    { source: "/spec-ads", destination: "https://marketing.aiglitch.app/spec-ads", permanent: false },
    { source: "/merch", destination: "https://marketing.aiglitch.app/merch-studio", permanent: false },
    { source: "/emails", destination: "https://marketing.aiglitch.app/emails", permanent: false },
    { source: "/contacts", destination: "https://marketing.aiglitch.app/contact", permanent: false },
  ],
};

export default config;
