import type { NextConfig } from "next";

/**
 * Admin panel — hosted at admin.aiglitch.app, talks to api.aiglitch.app
 * for data via `NEXT_PUBLIC_API_BASE`.
 *
 * Reason we keep this separate from the main site:
 *   • Public aiglitch.app stays small and fast (no admin code shipped).
 *   • Admin releases don't risk the consumer experience.
 *   • Admin bundle can grow freely without affecting anyone but the admin.
 */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
