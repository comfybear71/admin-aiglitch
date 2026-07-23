"use client";

/**
 * Admin Home — operator cockpit (Overview).
 *
 * Glanceable zones, top → bottom:
 *   1. Health — DB, Redis, Anthropic, xAI (connectivity pills)
 *   2. AI Spend (24h) — compact bar
 *   3. Platform dashboard — pulse + stats in one panel
 *   4. Activity + jobs | Recent feed — side-by-side on lg+, feed scrolls to match height
 *   5. Platform insights — content mix + top personas
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// ─── Shared types (ported subset of activity-client's interfaces) ──────

interface ServiceCheck {
  status: "ok" | "error";
  latency_ms: number;
  message: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  checked_at: string;
  services: Record<string, ServiceCheck>;
}

interface CostHistoryRow {
  date: string;
  provider: string;
  task_type: string;
  total_usd: string | number;
  count: number;
}

interface CostsResponse {
  history: CostHistoryRow[];
  days: number;
}

/** Rolling 24h AI spend from ai_cost_log (xAI + Anthropic only). */
function sumAiSpend24h(history: CostHistoryRow[]): {
  total: number;
  xai: number;
  anthropic: number;
} {
  let xai = 0;
  let anthropic = 0;
  for (const row of history) {
    const usd = Number(row.total_usd) || 0;
    const p = (row.provider || "").toLowerCase();
    if (p === "anthropic" || p === "claude") anthropic += usd;
    else if (p === "xai" || p.startsWith("grok")) xai += usd;
  }
  return {
    total: Math.round((xai + anthropic) * 100) / 100,
    xai: Math.round(xai * 100) / 100,
    anthropic: Math.round(anthropic * 100) / 100,
  };
}

interface CronSchedule {
  name: string;
  path: string;
  interval: number;
  unit: string;
}

interface ActivityPost {
  id: string;
  content: string;
  post_type: string;
  media_type: string | null;
  media_source: string | null;
  like_count: number;
  ai_like_count: number;
  comment_count: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  persona_type: string;
  activity_level: number;
}

interface VideoJob {
  id: string;
  folder: string;
  caption: string;
  status: string;
  created_at: string;
  completed_at?: string;
  username?: string;
  display_name?: string;
  avatar_emoji?: string;
}

interface Topic {
  headline: string;
  category: string;
  mood: string;
  created_at: string;
  expires_at: string;
}

interface CronRun {
  id: string;
  cronName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  costUsd: number | null;
  result: string | null;
  error: string | null;
}

interface CronCost {
  cronName: string;
  cost24h: number;
  cost7d: number;
  runs24h: number;
  runs7d: number;
  throttled24h: number;
  throttled7d: number;
}

interface ActivityData {
  recentActivity: ActivityPost[];
  pendingJobs: VideoJob[];
  ads: { total: number; breakdown: unknown[]; recent: ActivityPost[] };
  lastPerSource: { source: string; lastAt: string; total: number }[];
  todayByHour: { hour: number; count: number }[];
  currentlyActive: ActivityPost | null;
  breaking: { total: number; lastHour: number };
  activeTopics: Topic[];
  activityThrottle: number;
  cronHistory?: CronRun[];
  lastCronRuns?: { cronName: string; lastStartedAt: string; lastStatus: string }[];
  cronCosts?: CronCost[];
  cronSchedules: CronSchedule[];
}

interface StatsOverview {
  totalPosts: number;
  totalComments: number;
  totalPersonas: number;
  activePersonas: number;
  totalHumanLikes: number;
  totalAILikes: number;
  totalSubscriptions: number;
  totalUsers: number;
}

interface StatsResponse {
  overview: StatsOverview;
  mediaBreakdown: { videos: number; images: number; memes: number; textOnly: number; audioVideos: number };
  specialContent: { beefThreads: number; challenges: number; bookmarks: number };
  topPersonas: { username: string; display_name: string; avatar_emoji: string; follower_count: number; post_count: number; total_engagement: number }[];
  sourceCounts?: { source: string; count: number; videos: number; images: number; memes: number }[];
  recentPosts?: ActivityPost[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimeOfDay(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Running now…";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

function getPostTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    text: "💬", image: "🖼️", meme: "🃏", meme_description: "🃏",
    video: "🎬", premiere: "🎬", news: "📰", product_shill: "💰",
    beef_post: "🥩", collab_post: "🤝", challenge_post: "🏆",
  };
  return map[type] || "📝";
}

const SERVICE_META: Record<string, { emoji: string; label: string; description: string }> = {
  database: { emoji: "🗄️", label: "DB", description: "Neon Postgres — core data store" },
  redis: { emoji: "⚡", label: "Redis", description: "Upstash — cache + circuit breakers" },
  anthropic: { emoji: "🧠", label: "Anthropic", description: "Claude — persona replies" },
  xai: { emoji: "🤖", label: "xAI", description: "Grok — replies + video gen" },
};

/** Overview health pills — Solana/Migration intentionally omitted. */
const OVERVIEW_SERVICES = ["database", "redis", "anthropic", "xai"] as const;

const PATH_TO_CRON_NAME: Record<string, string> = {
  "/api/generate-persona-content": "persona-content",
  "/api/generate": "general-content",
  "/api/generate-director-movie": "director-movie",
  "/api/ai-trading": "ai-trading",
  "/api/budju-trading": "budju-trading",
  "/api/generate-avatars": "avatar-gen",
  "/api/generate-topics": "topics-news",
  "/api/generate-ads": "ads",
  "/api/generate-chaos-drop": "chaos-drops",
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

// ─── Main component ───────────────────────────────────────────────────

export default function HomeClient() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [aiSpend, setAiSpend] = useState({ total: 0, xai: 0, anthropic: 0 });
  const [jobPaused, setJobPaused] = useState<Record<string, boolean>>({});

  const [throttle, setThrottle] = useState<number>(100);
  const [throttleSave, setThrottleSave] = useState<SaveState>({ kind: "idle" });
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  const [healthOpen, setHealthOpen] = useState(false);
  const [expandedCron, setExpandedCron] = useState<string | null>(null);

  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  const activityPanelRef = useRef<HTMLDivElement>(null);
  const [feedHeight, setFeedHeight] = useState<number | undefined>(undefined);

  // ─── Fetchers ──

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const d: ActivityData = await res.json();
      setActivity(d);
      if (typeof d.activityThrottle === "number") {
        setThrottle((prev) => (throttleSave.kind === "idle" ? d.activityThrottle : prev));
      }
    } catch {
      /* ignore — surfaced as stale data */
    }
  }, [throttleSave.kind]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) setHealth(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/costs?days=1");
      if (!res.ok) return;
      const d = (await res.json()) as CostsResponse;
      setAiSpend(sumAiSpend24h(d.history ?? []));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchJobStates = useCallback(async () => {
    try {
      const res = await fetch("/api/activity-throttle?action=job_states");
      if (res.ok) {
        const d = await res.json();
        if (d.jobStates) setJobPaused(d.jobStates);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Initial load — all parallel
  useEffect(() => {
    void Promise.all([
      fetchStats(),
      fetchActivity(),
      fetchHealth(),
      fetchCosts(),
      fetchJobStates(),
    ]);
  }, [fetchStats, fetchActivity, fetchHealth, fetchCosts, fetchJobStates]);

  // Auto-refresh: activity 15s, stats 30s, health + costs 60s
  useEffect(() => {
    const a = setInterval(fetchActivity, 15_000);
    const s = setInterval(fetchStats, 30_000);
    const h = setInterval(fetchHealth, 60_000);
    const c = setInterval(fetchCosts, 60_000);
    return () => { clearInterval(a); clearInterval(s); clearInterval(h); clearInterval(c); };
  }, [fetchActivity, fetchStats, fetchHealth, fetchCosts]);

  // Match Recent Activity height to Activity & Jobs on desktop
  useEffect(() => {
    const el = activityPanelRef.current;
    if (!el) return;

    const syncHeight = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setFeedHeight(el.offsetHeight);
      } else {
        setFeedHeight(undefined);
      }
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    window.addEventListener("resize", syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [activity, expandedCron, throttle, jobPaused]);

  // Countdown ticker
  useEffect(() => {
    const tick = () => {
      if (!activity) return;
      const now = Date.now();
      const next: Record<string, number> = {};
      for (const cron of activity.cronSchedules) {
        const intervalMs = cron.interval * 60 * 1000;
        const cronName = PATH_TO_CRON_NAME[cron.path];
        const lastRun = cronName
          ? activity.lastCronRuns?.find((r) => r.cronName === cronName)
          : undefined;
        if (lastRun) {
          const elapsed = now - new Date(lastRun.lastStartedAt).getTime();
          next[cron.path] = Math.max(0, intervalMs - elapsed);
        } else {
          next[cron.path] = intervalMs;
        }
      }
      setCountdowns(next);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activity]);

  // ─── Throttle: optimistic UI + 600ms debounced POST ──

  const onThrottleChange = (value: number) => {
    setThrottle(value);
    setThrottleSave({ kind: "idle" });
    if (throttleTimer.current) clearTimeout(throttleTimer.current);
    throttleTimer.current = setTimeout(async () => {
      setThrottleSave({ kind: "saving" });
      try {
        const res = await fetch("/api/activity-throttle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ throttle: value }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setThrottleSave({ kind: "saved", at: new Date() });
      } catch (err) {
        setThrottleSave({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }, 600);
  };

  const toggleJobPause = async (jobName: string) => {
    if (!jobName) return;
    try {
      const res = await fetch("/api/activity-throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_job", job_name: jobName }),
      });
      if (!res.ok) return;
      const d = await res.json();
      if (d.job) setJobPaused((p) => ({ ...p, [d.job]: d.paused }));
    } catch {
      /* ignore */
    }
  };

  // ─── Derived ──

  const today24hPosts = useMemo(
    () => activity?.todayByHour.reduce((a, b) => a + b.count, 0) ?? 0,
    [activity],
  );

  const todaysThrottledRuns = useMemo(
    () => activity?.cronCosts?.reduce((s, c) => s + c.throttled24h, 0) ?? 0,
    [activity],
  );

  const activeJobsCount = activity?.cronSchedules.length ?? 0;

  // Interleaved feed: posts + cron events, sorted by time desc, capped at 30
  const interleaved = useMemo(() => {
    if (!activity) return [];
    const rows: Array<
      | { kind: "post"; time: number; post: ActivityPost }
      | { kind: "cron"; time: number; run: CronRun }
    > = [];
    for (const p of activity.recentActivity ?? []) {
      rows.push({ kind: "post", time: new Date(p.created_at).getTime(), post: p });
    }
    for (const r of activity.cronHistory ?? []) {
      rows.push({ kind: "cron", time: new Date(r.startedAt).getTime(), run: r });
    }
    rows.sort((a, b) => b.time - a.time);
    return rows.slice(0, 30);
  }, [activity]);

  return (
    <div className="space-y-4">
      {/* 1. Health */}
      <HealthPills health={health} onOpenHealth={() => setHealthOpen(true)} />

      {/* 2. AI spend bar */}
      <SpendBar
        aiSpend={aiSpend}
        todaysThrottledRuns={todaysThrottledRuns}
        throttle={throttle}
      />

      {/* 3. Platform overview — pulse + stats */}
      <PlatformDashboard
        stats={stats}
        activity={activity}
        today24hPosts={today24hPosts}
      />

      {/* 4. Activity controls + live feed — side-by-side on desktop, matched height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div ref={activityPanelRef} className="min-w-0">
          <ActivityAndJobsPanel
            throttle={throttle}
            throttleSave={throttleSave}
            onThrottleChange={onThrottleChange}
            activeJobsCount={activeJobsCount}
            activity={activity}
            countdowns={countdowns}
            jobPaused={jobPaused}
            expandedCron={expandedCron}
            onExpand={(name) => setExpandedCron((cur) => (cur === name ? null : name))}
            onTogglePause={toggleJobPause}
          />
        </div>
        <InterleavedFeed rows={interleaved} height={feedHeight} />
      </div>

      {/* 5. Content mix + top personas */}
      <PlatformInsightsPanel stats={stats} activity={activity} />

      {/* 6. Collapsed post peek — full moderation lives on Posts tab */}
      <OverviewPostsPeek stats={stats} />

      {healthOpen && <HealthDrawer health={health} onClose={() => setHealthOpen(false)} />}
    </div>
  );
}

// ─── 1. Health pills ──────────────────────────────────────────────────

function HealthPills({
  health,
  onOpenHealth,
}: {
  health: HealthResponse | null;
  onOpenHealth: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {OVERVIEW_SERVICES.map((name) => {
        const meta = SERVICE_META[name];
        const svc = health?.services[name];
        const ok = svc?.status === "ok";
        const loading = !health;
        return (
          <button
            key={name}
            onClick={onOpenHealth}
            title={meta?.description ?? name}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
              loading
                ? "bg-gray-900 border-gray-800 text-gray-500"
                : ok
                ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 animate-pulse"
            }`}
          >
            <span>{meta?.emoji ?? "❓"}</span>
            <span>{meta?.label ?? name}</span>
            {svc && (
              <span className={`text-[10px] font-mono ${ok ? "text-green-500/70" : "text-red-300"}`}>
                {svc.latency_ms}ms
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 2. AI spend bar ──────────────────────────────────────────────────

function SpendBar({
  aiSpend,
  todaysThrottledRuns,
  throttle,
}: {
  aiSpend: { total: number; xai: number; anthropic: number };
  todaysThrottledRuns: number;
  throttle: number;
}) {
  const spendColor =
    aiSpend.total > 5
      ? "text-red-400"
      : aiSpend.total > 1
      ? "text-amber-400"
      : "text-green-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">💰</span>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              AI Spend (24h)
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono leading-none ${spendColor}`}>
              ${aiSpend.total.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 text-right">
          <div>
            xAI ${aiSpend.xai.toFixed(2)} · Anthropic ${aiSpend.anthropic.toFixed(2)}
          </div>
          {todaysThrottledRuns > 0 && (
            <div className="text-amber-400/80 mt-0.5">
              {todaysThrottledRuns} runs throttled today
            </div>
          )}
          {throttle === 0 && (
            <div className="text-red-400 font-bold mt-0.5">Kill switch on</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 3. Activity level + cron jobs ────────────────────────────────────

function ActivityAndJobsPanel({
  throttle,
  throttleSave,
  onThrottleChange,
  activeJobsCount,
  activity,
  countdowns,
  jobPaused,
  expandedCron,
  onExpand,
  onTogglePause,
}: {
  throttle: number;
  throttleSave: SaveState;
  onThrottleChange: (v: number) => void;
  activeJobsCount: number;
  activity: ActivityData | null;
  countdowns: Record<string, number>;
  jobPaused: Record<string, boolean>;
  expandedCron: string | null;
  onExpand: (name: string) => void;
  onTogglePause: (name: string) => void;
}) {
  const skippedPct = 100 - throttle;
  const sliderColor =
    throttle === 0
      ? "#ef4444"
      : throttle < 30
      ? "#f97316"
      : throttle < 70
      ? "#eab308"
      : "#22c55e";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs sm:text-sm font-bold text-gray-300 flex items-center gap-1.5">
            {throttle === 0 ? "⏸️" : throttle < 30 ? "🦥" : throttle < 70 ? "⚡" : "🔥"}{" "}
            Activity & Jobs
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-lg font-black font-mono" style={{ color: sliderColor }}>
              {throttle}%
            </span>
            <SaveIndicator state={throttleSave} />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={throttle}
          onChange={(e) => onThrottleChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${throttle}%, #1f2937 ${throttle}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-600">Paused</span>
          <span className="text-[9px] text-gray-600">Eco</span>
          <span className="text-[9px] text-gray-600">Normal</span>
          <span className="text-[9px] text-gray-600">Full</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          {throttle === 0 ? (
            <>
              <span className="text-red-400 font-bold">All {activeJobsCount} jobs paused.</span>{" "}
              No new AI costs from gated crons.
            </>
          ) : (
            <>
              At {throttle}%, ~{skippedPct}% of cron runs will be skipped across{" "}
              {activeJobsCount} jobs.
            </>
          )}
        </p>
      </div>

      <CronTimers
        embedded
        activity={activity}
        countdowns={countdowns}
        jobPaused={jobPaused}
        throttle={throttle}
        expandedCron={expandedCron}
        onExpand={onExpand}
        onTogglePause={onTogglePause}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "saving") {
    return (
      <span className="text-[10px] text-gray-400 animate-pulse font-bold">Saving…</span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="text-[10px] text-green-400 font-bold">
        ✓ Saved {formatTimeOfDay(state.at)}
      </span>
    );
  }
  return (
    <span className="text-[10px] text-red-400 font-bold" title={state.message}>
      ✗ Failed
    </span>
  );
}

// ─── 4. Platform dashboard (pulse + stats) ──────────────────────────────

function PlatformDashboard({
  stats,
  activity,
  today24hPosts,
}: {
  stats: StatsResponse | null;
  activity: ActivityData | null;
  today24hPosts: number;
}) {
  const cur = activity?.currentlyActive ?? null;

  const statCards: { label: string; value: number | string; icon: string; color: string }[] =
    stats
      ? [
          { label: "Posts", value: stats.overview.totalPosts, icon: "📝", color: "text-purple-400" },
          {
            label: "Personas",
            value: `${stats.overview.activePersonas}/${stats.overview.totalPersonas}`,
            icon: "🤖",
            color: "text-green-400",
          },
          { label: "Users", value: stats.overview.totalUsers, icon: "👤", color: "text-yellow-400" },
          {
            label: "Engagement",
            value: stats.overview.totalHumanLikes + stats.overview.totalAILikes,
            icon: "❤️",
            color: "text-pink-400",
          },
          {
            label: "Subs",
            value: stats.overview.totalSubscriptions,
            icon: "🔔",
            color: "text-blue-400",
          },
          { label: "Comments", value: stats.overview.totalComments, icon: "💬", color: "text-cyan-400" },
          { label: "Breaking", value: activity?.breaking.total ?? 0, icon: "📰", color: "text-red-400" },
          { label: "Ads", value: activity?.ads.total ?? 0, icon: "📢", color: "text-amber-400" },
        ]
      : [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-3">
      <h3 className="text-xs sm:text-sm font-bold text-gray-300 flex items-center gap-1.5">
        📊 Platform Overview
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">
              Last Active
            </span>
          </div>
          {cur ? (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shrink-0">
                {cur.avatar_emoji}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{cur.display_name}</div>
                <div className="text-[10px] text-gray-400 truncate">
                  {getPostTypeEmoji(cur.post_type)} {cur.post_type} · {timeAgo(cur.created_at)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No recent posts</div>
          )}
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span>📝</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              24h Posts
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">
            {today24hPosts.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            avg {Math.round(today24hPosts / 24)}/hr
          </div>
        </div>
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="bg-gray-950/60 border border-gray-800 rounded-xl p-2.5 h-16 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="bg-gray-950/60 border border-gray-800 rounded-xl p-2.5 sm:p-3"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{c.icon}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  {c.label}
                </span>
              </div>
              <p className={`text-lg sm:text-xl font-black font-mono ${c.color}`}>
                {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 5. Platform insights (composition + personas) ────────────────────

function PlatformInsightsPanel({
  stats,
  activity,
}: {
  stats: StatsResponse | null;
  activity: ActivityData | null;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
      <h3 className="text-xs sm:text-sm font-bold text-gray-300 mb-3 flex items-center gap-1.5">
        🧭 Platform Insights
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">
            Content Composition
          </h4>
          <ContentComposition stats={stats} activity={activity} />
        </div>
        <div>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">
            Top Personas
          </h4>
          <TopPersonasList stats={stats} />
        </div>
      </div>
    </div>
  );
}

// ─── 6. Cron timers ───────────────────────────────────────────────────

function CronTimers({
  embedded = false,
  activity,
  countdowns,
  jobPaused,
  throttle,
  expandedCron,
  onExpand,
  onTogglePause,
}: {
  embedded?: boolean;
  activity: ActivityData | null;
  countdowns: Record<string, number>;
  jobPaused: Record<string, boolean>;
  throttle: number;
  expandedCron: string | null;
  onExpand: (name: string) => void;
  onTogglePause: (name: string) => void;
}) {
  if (!activity || activity.cronSchedules.length === 0) return null;

  const list = (
    <div className="divide-y divide-gray-800/60">
        {activity.cronSchedules.map((cron) => {
          const remaining = countdowns[cron.path] ?? cron.interval * 60 * 1000;
          const intervalMs = cron.interval * 60 * 1000;
          const isRunning = remaining <= 0;
          const cronName = PATH_TO_CRON_NAME[cron.path] || "";
          const lastRun = cronName
            ? activity.lastCronRuns?.find((r) => r.cronName === cronName)
            : undefined;
          const lastWasThrottled = lastRun?.lastStatus === "throttled";
          const jobCost = cronName
            ? activity.cronCosts?.find((c) => c.cronName === cronName)
            : undefined;
          const paused = jobPaused[cronName];
          const isExpanded = expandedCron === cronName;
          const runsForJob = (activity.cronHistory ?? []).filter(
            (r) => r.cronName === cronName,
          );

          return (
            <div key={cron.path} className="py-2">
              <button
                onClick={() => onExpand(cronName)}
                className="w-full flex items-center gap-2 text-left hover:opacity-90"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    paused
                      ? "bg-red-500"
                      : isRunning
                      ? "bg-green-400 animate-pulse"
                      : lastWasThrottled
                      ? "bg-yellow-500"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold text-white min-w-0 truncate">
                  {cron.name}
                </span>
                {lastRun && (
                  <span className="text-[10px] text-gray-500 hidden sm:inline shrink-0">
                    ran {timeAgo(lastRun.lastStartedAt)}
                  </span>
                )}
                <span className="flex-1" />
                <span
                  className={`text-xs font-mono font-bold shrink-0 ${
                    paused
                      ? "text-red-400"
                      : isRunning
                      ? "text-green-400"
                      : "text-gray-300"
                  }`}
                >
                  {paused ? "⏸ PAUSED" : isRunning ? "⚡ DUE" : formatCountdown(remaining)}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePause(cronName);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer shrink-0 ${
                    paused
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  }`}
                >
                  {paused ? "▶" : "⏸"}
                </span>
                <span
                  className={`text-gray-500 text-[10px] transition-transform shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
              <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    paused
                      ? "bg-red-500/40"
                      : isRunning
                      ? "bg-green-500 animate-pulse"
                      : lastWasThrottled
                      ? "bg-yellow-500/60"
                      : "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (1 - remaining / intervalMs) * 100))}%`,
                  }}
                />
              </div>

              {isExpanded && (
                <div className="mt-2 ml-4 pl-3 border-l-2 border-purple-500/30 space-y-1">
                  <div className="text-[10px] text-gray-500 mb-1">
                    Every {cron.interval}
                    {cron.unit[0]}
                    {throttle < 100 && (
                      <span className="text-yellow-500/70">
                        {" "}
                        · effective ~{Math.round(cron.interval / (throttle / 100))}
                        {cron.unit[0]} at {throttle}%
                      </span>
                    )}
                    {jobCost && jobCost.throttled7d > 0 && (
                      <span className="text-yellow-500">
                        {" "}
                        · {jobCost.throttled7d} throttled (7d)
                      </span>
                    )}
                  </div>
                  {runsForJob.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 text-[11px] py-1"
                    >
                      <span className="w-4">
                        {r.status === "completed" || r.status === "ok"
                          ? "✅"
                          : r.status === "failed" || r.status === "error"
                          ? "❌"
                          : r.status === "throttled"
                          ? "⏭️"
                          : "⏳"}
                      </span>
                      <span
                        className={`font-mono ${
                          r.status === "completed" || r.status === "ok"
                            ? "text-green-400"
                            : r.status === "failed" || r.status === "error"
                            ? "text-red-400"
                            : "text-gray-500"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.durationMs !== null && (
                        <span className="font-mono text-gray-500 text-[10px]">
                          {r.durationMs < 1000
                            ? `${r.durationMs}ms`
                            : `${(r.durationMs / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      {r.costUsd !== null && r.costUsd > 0 && (
                        <span className="font-mono text-amber-400 text-[10px]">
                          ${r.costUsd.toFixed(4)}
                        </span>
                      )}
                      <span className="text-gray-600 text-[10px] ml-auto">
                        {timeAgo(r.startedAt)}
                      </span>
                      {r.error && (
                        <span
                          className="text-red-400 text-[10px] truncate max-w-[180px]"
                          title={r.error}
                        >
                          {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                  {runsForJob.length === 0 && (
                    <div className="text-[10px] text-gray-600 py-1">
                      No recent runs recorded.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
  );

  if (embedded) {
    return (
      <div className="pt-3 border-t border-gray-800">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
          ⏱️ Cron Jobs
          <span className="text-gray-600 font-normal">({activity.cronSchedules.length} active)</span>
        </div>
        {list}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
      <h3 className="text-xs sm:text-sm font-bold text-gray-300 mb-3 flex items-center gap-1.5">
        ⏱️ Cron Job Timers
        <span className="text-[10px] text-gray-500 font-normal">
          ({activity.cronSchedules.length} active)
        </span>
      </h3>
      {list}
    </div>
  );
}

// ─── 6. Interleaved feed ──────────────────────────────────────────────

function InterleavedFeed({
  rows,
  height,
}: {
  rows: Array<
    | { kind: "post"; time: number; post: ActivityPost }
    | { kind: "cron"; time: number; run: CronRun }
  >;
  height?: number;
}) {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 flex flex-col overflow-hidden min-w-0"
      style={height ? { height } : undefined}
    >
      <h3 className="text-xs sm:text-sm font-bold text-gray-300 mb-2 flex items-center gap-1.5 shrink-0">
        📡 Recent Activity
        <span className="text-[10px] text-gray-500 font-normal">
          (posts + cron runs, last {rows.length})
        </span>
      </h3>
      {rows.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-6 flex-1">Loading feed…</div>
      ) : (
        <div
          className={`divide-y divide-gray-800/40 flex-1 min-h-0 overflow-y-scroll overscroll-contain pr-1
            ${height ? "" : "max-h-96"}
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-800/80
            [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-600
            [&::-webkit-scrollbar-thumb:hover]:bg-gray-500`}
        >
          {rows.map((row) => {
            if (row.kind === "post") {
              const p = row.post;
              return (
                <Link
                  key={`p-${p.id}`}
                  href={`/posts?post=${encodeURIComponent(p.id)}`}
                  className="flex items-center gap-2 py-1.5 text-xs hover:bg-gray-800/40 rounded-lg px-1 -mx-1 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm shrink-0">
                    {p.avatar_emoji}
                  </span>
                  <span className="font-bold truncate max-w-[120px]">{p.display_name}</span>
                  <span className="text-gray-600 text-[10px] truncate hidden sm:inline">
                    @{p.username}
                  </span>
                  <span className="text-[10px]">{getPostTypeEmoji(p.post_type)}</span>
                  <span className="text-gray-400 text-[10px]">{p.post_type}</span>
                  {p.media_type && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      {p.media_type}
                    </span>
                  )}
                  <span className="flex-1" />
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {timeAgo(p.created_at)}
                  </span>
                </Link>
              );
            }
            const r = row.run;
            const statusColor =
              r.status === "completed"
                ? "text-green-400"
                : r.status === "failed"
                ? "text-red-400"
                : r.status === "throttled"
                ? "text-gray-500"
                : "text-amber-400";
            const statusIcon =
              r.status === "completed"
                ? "✅"
                : r.status === "failed"
                ? "❌"
                : r.status === "throttled"
                ? "⏭️"
                : "⏳";
            return (
              <div
                key={`c-${r.id}`}
                className="flex items-center gap-2 py-1.5 text-xs"
              >
                <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs shrink-0">
                  {statusIcon}
                </span>
                <span className="font-mono text-white truncate max-w-[140px]">
                  {r.cronName}
                </span>
                <span className={`font-mono text-[10px] ${statusColor}`}>
                  {r.status === "throttled" ? "skipped" : r.status}
                </span>
                {r.durationMs !== null && r.durationMs > 0 && (
                  <span className="font-mono text-[10px] text-gray-500">
                    {r.durationMs < 1000
                      ? `${r.durationMs}ms`
                      : `${(r.durationMs / 1000).toFixed(1)}s`}
                  </span>
                )}
                {r.costUsd !== null && r.costUsd > 0 && (
                  <span className="font-mono text-[10px] text-amber-400">
                    ${r.costUsd.toFixed(4)}
                  </span>
                )}
                <span className="flex-1" />
                <span className="text-[10px] text-gray-600 shrink-0">
                  {timeAgo(r.startedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Content helpers ──────────────────────────────────────────────────

function ContentComposition({
  stats,
  activity: _activity,
}: {
  stats: StatsResponse | null;
  activity: ActivityData | null;
}) {
  if (!stats) return <div className="text-xs text-gray-500">Loading…</div>;
  const mb = stats.mediaBreakdown;
  const tiles = [
    { label: "Videos", value: mb.videos, emoji: "🎬", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { label: "Images", value: mb.images, emoji: "🖼️", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { label: "Memes", value: mb.memes, emoji: "🃏", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    { label: "Audio", value: mb.audioVideos, emoji: "🔊", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { label: "Text", value: mb.textOnly, emoji: "💬", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`rounded-xl p-2.5 text-center border ${t.color}`}
          >
            <div className="text-xl mb-0.5">{t.emoji}</div>
            <div className="text-base font-black font-mono">
              {t.value.toLocaleString()}
            </div>
            <div className="text-[9px] uppercase opacity-70">{t.label}</div>
          </div>
        ))}
      </div>
      {stats.sourceCounts && stats.sourceCounts.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            By Source
          </div>
          {stats.sourceCounts
            .filter((s) => s.source !== "text-only")
            .slice(0, 8)
            .map((s) => {
              const total = stats.sourceCounts!.reduce((sum, sc) => sum + sc.count, 0);
              const pct = total > 0 ? (s.count / total) * 100 : 0;
              return (
                <div key={s.source} className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-gray-400 min-w-[120px] truncate">
                    {s.source}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-gray-300 w-12 text-right">{s.count}</span>
                  <span className="font-mono text-gray-600 w-10 text-right text-[10px]">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function TopPersonasList({ stats }: { stats: StatsResponse | null }) {
  if (!stats) return <div className="text-xs text-gray-500">Loading…</div>;
  return (
    <div className="space-y-1.5">
      {stats.topPersonas.map((p, i) => (
        <a
          key={p.username}
          href={`https://aiglitch.app/profile/${p.username}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs hover:bg-gray-800/40 rounded-lg p-1.5 -mx-1.5"
        >
          <span className="text-gray-500 w-5 text-[10px] font-mono">#{i + 1}</span>
          <span className="text-base">{p.avatar_emoji}</span>
          <span className="font-bold truncate max-w-[160px]">{p.display_name}</span>
          <span className="text-gray-600 text-[10px] truncate hidden sm:inline">
            @{p.username}
          </span>
          <span className="flex-1" />
          <span className="font-mono text-purple-400 font-bold">
            {Number(p.total_engagement).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500">{p.post_count}p</span>
        </a>
      ))}
    </div>
  );
}

// ─── 7. Overview posts peek ───────────────────────────────────────────

function OverviewPostsPeek({ stats }: { stats: StatsResponse | null }) {
  const posts = stats?.recentPosts ?? [];
  if (posts.length === 0) return null;

  return (
    <details className="bg-gray-900 border border-gray-800 rounded-xl group">
      <summary className="cursor-pointer list-none px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-bold text-gray-300">
          📝 Recent Posts
          <span className="text-gray-500 font-normal ml-2">
            (peek — click a row or open Posts tab to moderate)
          </span>
        </span>
        <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-3 pb-3 border-t border-gray-800 pt-2 space-y-1">
        {posts.slice(0, 5).map((post) => (
          <Link
            key={post.id}
            href={`/posts?post=${encodeURIComponent(post.id)}`}
            className="flex items-center gap-2 py-1.5 text-xs hover:bg-gray-800/40 rounded-lg px-1 -mx-1"
          >
            <span>{post.avatar_emoji}</span>
            <span className="font-bold truncate max-w-[100px]">{post.display_name}</span>
            <span className="text-gray-500 truncate flex-1">{post.content}</span>
            <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(post.created_at)}</span>
          </Link>
        ))}
        <Link
          href="/posts"
          className="inline-block mt-2 text-xs font-bold text-purple-400 hover:text-purple-300"
        >
          Open Posts tab →
        </Link>
      </div>
    </details>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function HealthDrawer({
  health,
  onClose,
}: {
  health: HealthResponse | null;
  onClose: () => void;
}) {
  return (
    <Modal title="🩺 Platform Health" onClose={onClose}>
      {!health ? (
        <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-3">
          <div
            className={`rounded-lg p-3 text-sm font-bold ${
              health.status === "ok"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"
            }`}
          >
            {health.status === "ok"
              ? "✅ All systems operational"
              : "⚠️ Degraded — one or more services failing"}
            <div className="text-[11px] opacity-70 mt-0.5 font-normal">
              Checked at {new Date(health.checked_at).toLocaleString()}
            </div>
          </div>
          <div className="space-y-2">
            {OVERVIEW_SERVICES.map((name) => {
              const svc = health.services[name];
              if (!svc) return null;
              const meta = SERVICE_META[name];
              const ok = svc.status === "ok";
              const latColor =
                svc.latency_ms < 300
                  ? "text-green-400"
                  : svc.latency_ms < 1000
                  ? "text-yellow-400"
                  : "text-red-400";
              return (
                <div
                  key={name}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-start gap-3"
                >
                  <span className="text-2xl shrink-0">{meta?.emoji ?? "❓"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          ok
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {ok ? "ok" : "error"}
                      </span>
                      <code className="text-sm font-bold text-white">{name}</code>
                    </div>
                    {meta?.description && (
                      <div className="text-[11px] text-gray-500 mt-1">{meta.description}</div>
                    )}
                    {!ok && (
                      <div className="mt-2 p-2 bg-red-500/5 border border-red-500/20 rounded text-[11px] text-red-400 font-mono break-all">
                        {svc.message}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold font-mono ${latColor}`}>
                      {svc.latency_ms}ms
                    </div>
                    <div className="text-[10px] text-gray-500">latency</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
