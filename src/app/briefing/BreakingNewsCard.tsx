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

type Action = "toggle" | "enable" | "disable" | "reset_daily_count" | "regenerate_brand" | "force_trigger";

const REGEN_TIMEOUT_MS = 90_000;

export default function BreakingNewsCard() {
  const [state, setState] = useState<BreakingNewsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [triggering, setTriggering] = useState(false);
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

  const post = useCallback(async (action: Action): Promise<boolean> => {
    const res = await fetch("/api/admin/breaking-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return false;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  }, []);

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
        "Force-trigger the breaking-news pipeline on the next unprocessed topic? Runs the full intro+body+outro flow (~60–90s, ~$0.30).",
      )
    ) {
      return;
    }
    setTriggering(true);
    setError(null);
    try {
      await post("force_trigger");
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggering(false);
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
            {triggering ? "⏳ Triggering…" : "⚡ Force Trigger"}
          </button>
          <span className="text-[10px] text-gray-500">
            Fire pipeline on latest topic without waiting for cron.
          </span>
        </div>
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
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onReset}
          disabled={resetting}
          className="px-2.5 py-1 bg-gray-800 text-gray-300 rounded text-[11px] hover:bg-gray-700 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "🔄 Reset daily count"}
        </button>
        {error && (
          <span
            className="text-[10px] text-red-400 truncate max-w-[50%]"
            title={error}
          >
            ⚠️ {error}
          </span>
        )}
      </div>
    </div>
  );
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
