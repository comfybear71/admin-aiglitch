"use client";

/**
 * Breaking News admin card — toggle the breaking-news generator,
 * watch today's count vs daily cap, manage brand intro/outro assets.
 *
 * Backed by `/api/admin/breaking-news` on aiglitch-api (proxied).
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface BreakingNewsState {
  enabled: boolean;
  dailyCap: number;
  count: number;
  remaining: number;
  intro_url: string | null;
  outro_url: string | null;
}

type Action =
  | "toggle"
  | "enable"
  | "disable"
  | "reset_daily_count"
  | "regenerate_brand"
  | "force_trigger"
  | "repair_orphan_posts";

/** Per-topic outcome returned by the backend `force_trigger` action. */
interface ForceTriggerResult {
  topic_id: string;
  status: "posted" | "skipped" | "failed" | "cap_hit" | "disabled";
  video_url?: string;
  post_id?: string;
  error?: string;
}

interface ForceTriggerResponse {
  ok?: boolean;
  results?: ForceTriggerResult[];
}

/** Inline feedback banner shown after a Force Trigger run. */
type TriggerFeedback = { kind: "success" | "warn" | "error"; msg: string };

const REGEN_TIMEOUT_MS = 90_000;
const FORCE_TRIGGER_TIMEOUT_MS = 15 * 60 * 1000; // 15 min — backend maxDuration is 800s

export default function BreakingNewsCard() {
  const [state, setState] = useState<BreakingNewsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerPhase, setTriggerPhase] = useState<string>("");
  const [triggerFeedback, setTriggerFeedback] = useState<TriggerFeedback | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const regenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/breaking-news");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BreakingNewsState = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Initial load + 30s auto-refresh
  useEffect(() => {
    void fetchState();
    const iv = setInterval(fetchState, 30_000);
    return () => clearInterval(iv);
  }, [fetchState]);

  useEffect(() => {
    return () => {
      if (regenTimeoutRef.current) clearTimeout(regenTimeoutRef.current);
    };
  }, []);

  const post = useCallback(
    async <T = unknown,>(
      action: Action,
      extras?: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<T | null> => {
      const res = await fetch("/api/admin/breaking-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(extras ?? {}) }),
        signal,
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!res.ok) {
        // Surface the backend's error message (e.g. {"error": "..."}) rather
        // than a bare status code, so the UI can show what actually went wrong.
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = `${body.error} (HTTP ${res.status})`;
        } catch {
          /* non-JSON error body — keep the status code */
        }
        throw new Error(detail);
      }
      try {
        return (await res.json()) as T;
      } catch {
        return null;
      }
    },
    [],
  );

  const onToggle = async () => {
    if (!state || toggling) return;
    const prev = state;
    // optimistic flip
    setState({ ...state, enabled: !state.enabled });
    setToggling(true);
    setError(null);
    try {
      await post("toggle");
      await fetchState();
    } catch (err) {
      setState(prev); // rollback
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setToggling(false);
    }
  };

  const onForceTrigger = async () => {
    if (triggering) return;
    if (
      !confirm(
        "Force-trigger the breaking-news pipeline on the next unprocessed topic? This is SLOW — takes 5–8 minutes. The card will stay locked until it finishes.",
      )
    ) {
      return;
    }
    setTriggering(true);
    setTriggerPhase("Generating… (5–8 min)");
    setError(null);
    setTriggerFeedback(null);
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), FORCE_TRIGGER_TIMEOUT_MS);
    try {
      const data = await post<ForceTriggerResponse>(
        "force_trigger",
        { max_topics: 1 },
        ac.signal,
      );
      // 401 → post() already redirected; data is null, nothing to report.
      if (data) setTriggerFeedback(summarizeForceTrigger(data.results ?? []));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setTriggerFeedback({
        kind: "error",
        msg: aborted
          ? "Force Trigger timed out after 15 min — re-checking status to confirm whether it actually completed."
          : `Force Trigger failed: ${msg}`,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    // Either way, re-poll to confirm whether count incremented
    setTriggerPhase("Verifying…");
    await fetchState();
    setTriggering(false);
    setTriggerPhase("");
  };

  const onRepairOrphans = async () => {
    if (repairing) return;
    if (
      !confirm(
        "Repair orphan posts? This is a one-shot data fix — only run if something went wrong.",
      )
    ) {
      return;
    }
    setRepairing(true);
    setError(null);
    try {
      const result = await post<{ repaired?: number; post_ids?: string[] }>(
        "repair_orphan_posts",
      );
      const n = result?.repaired ?? 0;
      setToast(
        n === 0
          ? "No orphans found — nothing to repair."
          : `Repaired ${n} orphan post${n === 1 ? "" : "s"}.`,
      );
      setTimeout(() => setToast(null), 6000);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairing(false);
    }
  };

  const onReset = async () => {
    if (resetting) return;
    setResetting(true);
    setError(null);
    try {
      await post("reset_daily_count");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  };

  const onRegenerate = async () => {
    if (regenerating) return;
    if (!confirm("Re-generate intro + outro? Takes ~60s and costs ~$0.30.")) {
      return;
    }
    setRegenerating(true);
    setError(null);
    // 90s safety timeout — abort the spinner even if the API hangs
    regenTimeoutRef.current = setTimeout(() => {
      setRegenerating(false);
      setError("Regenerate timed out after 90s — check backend logs.");
    }, REGEN_TIMEOUT_MS);
    try {
      await post("regenerate_brand");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (regenTimeoutRef.current) {
        clearTimeout(regenTimeoutRef.current);
        regenTimeoutRef.current = null;
      }
      setRegenerating(false);
    }
  };

  // Loading skeleton
  if (!state && !error) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-40 bg-gray-800 rounded" />
          <div className="h-7 w-16 bg-gray-800 rounded-full" />
        </div>
        <div className="h-3 w-32 bg-gray-800 rounded mb-2" />
        <div className="h-3 w-24 bg-gray-800 rounded" />
      </div>
    );
  }

  const enabled = state?.enabled ?? false;
  const count = state?.count ?? 0;
  const cap = state?.dailyCap ?? 0;
  const remaining = state?.remaining ?? 0;
  const capReached = cap > 0 && remaining <= 0;
  const progressPct = cap > 0 ? Math.min(100, (count / cap) * 100) : 0;

  const statusBarColor =
    !enabled
      ? "bg-gray-600"
      : capReached
      ? "bg-amber-500"
      : "bg-gradient-to-r from-cyan-500 to-purple-500";

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
      {/* Header: title + toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-1.5">
            <span>🛰️</span> Breaking News
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Auto-generated breaking-news videos with brand intro/outro.
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling || !state}
          aria-pressed={enabled}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 shrink-0 ${
            enabled
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {toggling ? "⏳ ..." : enabled ? "🟢 ON" : "⚫ OFF"}
        </button>
      </div>

      {/* Counts */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <div className="text-xs text-gray-400">
            Today:{" "}
            <span
              className={`font-bold font-mono ${
                capReached ? "text-amber-400" : "text-cyan-400"
              }`}
            >
              {count} / {cap}
            </span>{" "}
            generated
          </div>
          <div className="text-[10px] text-gray-500">
            Remaining:{" "}
            <span
              className={`font-bold font-mono ${
                capReached ? "text-amber-400" : "text-green-400"
              }`}
            >
              {remaining}
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusBarColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {capReached && enabled && (
          <p className="text-[10px] text-amber-400 mt-1">
            Daily cap reached — generator will skip new runs until reset or
            tomorrow's UTC rollover.
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onForceTrigger}
            disabled={triggering || !enabled || capReached}
            title={
              !enabled
                ? "Enable Breaking News first"
                : capReached
                ? "Daily cap reached — reset count first"
                : "Run the pipeline on the next unprocessed topic"
            }
            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {triggering ? `⏳ ${triggerPhase || "Triggering…"}` : "⚡ Force Trigger"}
          </button>
          <span className="text-[10px] text-gray-500">
            {triggering
              ? "Card locked until pipeline finishes (~5–8 min)."
              : "Fire pipeline on latest topic without waiting for cron. Slow (5–8 min)."}
          </span>
        </div>
        {triggerFeedback && !triggering && (
          <div
            className={`mt-2 px-3 py-2 rounded text-xs font-bold border flex items-start justify-between gap-2 ${
              triggerFeedback.kind === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : triggerFeedback.kind === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <span>
              {triggerFeedback.kind === "success"
                ? "✓ "
                : triggerFeedback.kind === "error"
                ? "⚠️ "
                : "ℹ️ "}
              {triggerFeedback.msg}
            </span>
            <button
              onClick={() => setTriggerFeedback(null)}
              className="text-gray-500 hover:text-gray-300 shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Brand assets (collapsible) */}
      <div className="border-t border-gray-800 pt-2">
        <button
          onClick={() => setBrandOpen((x) => !x)}
          className="w-full flex items-center justify-between text-xs text-gray-300 hover:text-white"
        >
          <span className="font-bold">
            <span
              className={`inline-block transition-transform ${
                brandOpen ? "rotate-90" : ""
              }`}
            >
              ▸
            </span>{" "}
            Brand assets
          </span>
          <span className="text-[10px] text-gray-500">
            {state?.intro_url ? "✓" : "✗"} intro · {state?.outro_url ? "✓" : "✗"} outro
          </span>
        </button>
        {brandOpen && (
          <div className="mt-2 space-y-2 text-xs">
            <AssetRow label="Intro" url={state?.intro_url ?? null} />
            <AssetRow label="Outro" url={state?.outro_url ?? null} />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onRegenerate}
                disabled={regenerating}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? "⏳ Regenerating… (~60s)" : "🎬 Regenerate intro + outro"}
              </button>
              <span className="text-[10px] text-gray-500">~$0.30 · ~60s</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            disabled={resetting}
            className="px-2.5 py-1 bg-gray-800 text-gray-300 rounded text-[11px] hover:bg-gray-700 disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "🔄 Reset daily count"}
          </button>
          <button
            onClick={onRepairOrphans}
            disabled={repairing}
            title="One-shot data fix — only run if a previous trigger left a post without its associated video."
            className="px-2.5 py-1 bg-gray-800 text-gray-500 rounded text-[11px] hover:bg-gray-700 hover:text-gray-300 disabled:opacity-50"
          >
            {repairing ? "Repairing…" : "🔧 Repair orphan posts"}
          </button>
        </div>
        {error && (
          <span
            className="text-[10px] text-red-400 truncate max-w-[50%]"
            title={error}
          >
            ⚠️ {error}
          </span>
        )}
      </div>

      {toast && (
        <div className="mt-1 px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs font-bold">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

/**
 * Turn the backend `force_trigger` results into a single human-readable
 * banner. The backend returns 200 even when nothing happened (empty
 * results = no unprocessed topics, or per-topic skipped/cap_hit/disabled),
 * so we MUST inspect the body — a bare HTTP-ok check shows the user nothing.
 */
function summarizeForceTrigger(results: ForceTriggerResult[]): TriggerFeedback {
  if (results.length === 0) {
    return {
      kind: "warn",
      msg: "Nothing to trigger — every active topic already has a breaking-news video. Wait for a fresh daily topic (see Daily Briefing) and try again.",
    };
  }

  const posted = results.filter((r) => r.status === "posted").length;
  if (posted > 0) {
    return {
      kind: "success",
      msg: `Generated ${posted} breaking-news video${posted === 1 ? "" : "s"}.`,
    };
  }

  if (results.some((r) => r.status === "disabled")) {
    return { kind: "warn", msg: "Breaking News is disabled — enable it first, then trigger." };
  }
  if (results.some((r) => r.status === "cap_hit")) {
    return {
      kind: "warn",
      msg: "Daily cap reached — reset the count or wait for tomorrow's UTC rollover.",
    };
  }

  const failed = results.find((r) => r.status === "failed");
  if (failed) {
    return { kind: "error", msg: `Generation failed: ${failed.error || "unknown error"}` };
  }

  const skipped = results.find((r) => r.status === "skipped");
  if (skipped) {
    return { kind: "warn", msg: `Topic skipped: ${skipped.error || "no reason given"}` };
  }

  return { kind: "warn", msg: `Finished with status "${results[0].status}".` };
}

function AssetRow({ label, url }: { label: string; url: string | null }) {
  const ok = Boolean(url);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-gray-500 font-bold">{label}:</span>
      <span
        className={`text-[10px] font-bold ${
          ok ? "text-green-400" : "text-red-400"
        }`}
      >
        {ok ? "✓ generated" : "✗ missing"}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 text-[10px] truncate max-w-[260px]"
          title={url}
        >
          {url.split("/").pop() || url}
        </a>
      )}
    </div>
  );
}
