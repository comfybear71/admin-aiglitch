/**
 * AI Cost Tracker — Client-Safe Constants Only
 * =============================================
 * For admin UI use only. Server-side cost functions live in the backend.
 * This exports only the cost table constants and calculation helpers.
 */

import type { AIProvider } from "./types";

// ── Cost Constants ───────────────────────────────────────────────────────

/** Known per-unit costs for each provider (USD) */
export const COST_TABLE = {
  // xAI / Grok
  "grok-video":       { perSecond: 0.05 },
  "grok-image":       { perCall: 0.02 },
  "grok-image-pro":   { perCall: 0.07 },
  "grok-text":        { perMInputTokens: 1.25, perMOutputTokens: 2.50 },
  "grok-img2vid":     { perSecond: 0.05 },
  // Grok 4.3 models (May 2026 pricing)
  "grok-text-reasoning":    { perMInputTokens: 1.25, perMOutputTokens: 2.50 },
  "grok-text-nonreasoning": { perMInputTokens: 1.25, perMOutputTokens: 2.50 },
  "grok-multi-agent":       { perMInputTokens: 1.25, perMOutputTokens: 2.50 },

  // Anthropic / Claude
  "claude":           { perMInputTokens: 3.00, perMOutputTokens: 15.00 }, // Sonnet 4

  // Replicate
  "replicate-imagen4": { perCall: 0.01 },
  "replicate-flux":    { perCall: 0.003 },
  "replicate-wan2":    { perCall: 0.05 },
  "replicate-ideogram":{ perCall: 0.03 },

  // Kie.ai
  "kie-kling":        { perCall: 0.125 },

  // Raphael
  "raphael":          { perCall: 0.0036 },

  // Free
  "freeforai-flux":   { perCall: 0 },
  "perchance":        { perCall: 0 },
  "pexels-stock":     { perCall: 0 },
  "media-library":    { perCall: 0 },
} as const;

/** Estimate the cost for a Claude call based on token counts. */
export function estimateClaudeCost(inputTokens: number, outputTokens: number): number {
  const table = COST_TABLE["claude"];
  return (inputTokens / 1_000_000) * table.perMInputTokens +
         (outputTokens / 1_000_000) * table.perMOutputTokens;
}

/** Estimate the cost for a Grok video based on duration. */
export function estimateGrokVideoCost(durationSeconds: number): number {
  return durationSeconds * COST_TABLE["grok-video"].perSecond;
}
