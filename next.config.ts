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
  // ── Base admin routes (55) ──────────────────────────────────────
  { source: "/api/admin/action", destination: "https://api.aiglitch.app/api/admin/action" },
  { source: "/api/admin/ad-campaigns", destination: "https://api.aiglitch.app/api/admin/ad-campaigns" },
  { source: "/api/admin/animate-persona", destination: "https://api.aiglitch.app/api/admin/animate-persona" },
  { source: "/api/admin/announce", destination: "https://api.aiglitch.app/api/admin/announce" },
  { source: "/api/admin/batch-avatars", destination: "https://api.aiglitch.app/api/admin/batch-avatars" },
  { source: "/api/admin/blob-upload", destination: "https://api.aiglitch.app/api/admin/blob-upload" },
  { source: "/api/admin/briefing", destination: "https://api.aiglitch.app/api/admin/briefing" },
  { source: "/api/admin/budju-trading", destination: "https://api.aiglitch.app/api/admin/budju-trading" },
  { source: "/api/admin/channels", destination: "https://api.aiglitch.app/api/admin/channels" },
  { source: "/api/admin/chibify", destination: "https://api.aiglitch.app/api/admin/chibify" },
  { source: "/api/admin/coins", destination: "https://api.aiglitch.app/api/admin/coins" },
  { source: "/api/admin/contacts", destination: "https://api.aiglitch.app/api/admin/contacts" },
  { source: "/api/admin/costs", destination: "https://api.aiglitch.app/api/admin/costs" },
  { source: "/api/admin/cron-control", destination: "https://api.aiglitch.app/api/admin/cron-control" },
  { source: "/api/admin/cron-health", destination: "https://api.aiglitch.app/api/admin/cron-health" },
  { source: "/api/admin/director-prompts", destination: "https://api.aiglitch.app/api/admin/director-prompts" },
  { source: "/api/admin/elon-campaign", destination: "https://api.aiglitch.app/api/admin/elon-campaign" },
  { source: "/api/admin/email-outreach", destination: "https://api.aiglitch.app/api/admin/email-outreach" },
  { source: "/api/admin/emails", destination: "https://api.aiglitch.app/api/admin/emails" },
  { source: "/api/admin/events", destination: "https://api.aiglitch.app/api/admin/events" },
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
  { source: "/api/admin/merch", destination: "https://api.aiglitch.app/api/admin/merch" },
  { source: "/api/admin/migration", destination: "https://api.aiglitch.app/api/admin/migration" },
  { source: "/api/admin/mktg", destination: "https://api.aiglitch.app/api/admin/mktg" },
  { source: "/api/admin/nft-marketplace", destination: "https://api.aiglitch.app/api/admin/nft-marketplace" },
  { source: "/api/admin/nfts", destination: "https://api.aiglitch.app/api/admin/nfts" },
  { source: "/api/admin/persona-avatar", destination: "https://api.aiglitch.app/api/admin/persona-avatar" },
  { source: "/api/admin/personas", destination: "https://api.aiglitch.app/api/admin/personas" },
  { source: "/api/admin/posts", destination: "https://api.aiglitch.app/api/admin/posts" },
  { source: "/api/admin/prompts", destination: "https://api.aiglitch.app/api/admin/prompts" },
  { source: "/api/admin/promote-glitchcoin", destination: "https://api.aiglitch.app/api/admin/promote-glitchcoin" },
  { source: "/api/admin/settings", destination: "https://api.aiglitch.app/api/admin/settings" },
  { source: "/api/admin/snapshot", destination: "https://api.aiglitch.app/api/admin/snapshot" },
  { source: "/api/admin/spec-ads", destination: "https://api.aiglitch.app/api/admin/spec-ads" },
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

  // ── Auth endpoint ──────────────────────────────────────────────
  { source: "/api/auth/admin", destination: "https://api.aiglitch.app/api/auth/admin" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  rewrites: async () => ({
    beforeFiles: adminRewrites,
  }),
};

export default config;
