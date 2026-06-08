/**
 * Base URL of the consumer site (aiglitch.app). Use this to build
 * absolute links from admin.aiglitch.app to consumer routes like
 * /post/<id>, /me/<username>, /meatlab — relative paths in admin
 * code resolve against admin.aiglitch.app and 404.
 *
 * Override via NEXT_PUBLIC_CONSUMER_URL in Vercel env if the
 * consumer ever moves.
 */
export const CONSUMER_URL =
  process.env.NEXT_PUBLIC_CONSUMER_URL ?? "https://aiglitch.app";
