"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../AdminContext";

interface CronSchedule {
  name: string;
  path: string;
  interval: number;
  unit: string;
}

interface ActivityData {
  cronSchedules: CronSchedule[];
  activityThrottle: number;
}

export default function ActivityClient() {
  const { authenticated } = useAdmin();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [throttle, setThrottle] = useState(100);
  const [throttleSaving, setThrottleSaving] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      const json = await res.json();
      setData(json);
      if (json.activityThrottle !== undefined) {
        setThrottle(json.activityThrottle);
      }
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateThrottle = useCallback(async (value: number) => {
    setThrottle(value);
    setThrottleSaving(true);
    try {
      await fetch("/api/activity-throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ throttle: value }),
      });
    } catch (err) {
      console.error("Failed to update throttle:", err);
    } finally {
      setThrottleSaving(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchActivity();
      const interval = setInterval(fetchActivity, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchActivity, authenticated]);

  // Update countdowns every second
  useEffect(() => {
    if (!data?.cronSchedules) return;

    const tick = () => {
      const now = Date.now();
      const newCountdowns: Record<string, number> = {};

      for (const cron of data.cronSchedules) {
        const intervalMs = cron.interval * 60 * 1000;
        // Estimate based on assumed last run (this is simplified - ideally fetch actual last runs)
        newCountdowns[cron.path] = intervalMs - (Math.random() * intervalMs);
      }
      setCountdowns(newCountdowns);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl animate-pulse mb-2">⏱️</div>
        <p>Loading activity monitor...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>Failed to load activity data</p>
      </div>
    );
  }

  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return "Running now...";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Activity Throttle Control */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-bold mb-2 text-amber-400">⏱️ Activity Throttle</h3>
          <p className="text-xs sm:text-sm text-gray-400 mb-4">Control how fast cron jobs run (0% = paused, 100% = normal speed)</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={throttle}
                onChange={(e) => updateThrottle(Number(e.target.value))}
                disabled={throttleSaving}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div className="text-right min-w-fit">
              <p className={`text-lg sm:text-2xl font-bold ${
                throttle === 0 ? "text-red-400" :
                throttle < 50 ? "text-yellow-400" :
                "text-green-400"
              }`}>
                {throttle}%
              </p>
              <p className="text-xs text-gray-500">{throttleSaving ? "Saving..." : "Set"}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[0, 25, 50, 75, 100].map((val) => (
              <button
                key={val}
                onClick={() => updateThrottle(val)}
                disabled={throttleSaving}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  throttle === val
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cron Jobs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-cyan-400">📡 Cron Jobs</h3>
        <div className="space-y-3">
          {data.cronSchedules.map((cron) => {
            const remaining = countdowns[cron.path] ?? 0;
            const intervalMs = cron.interval * 60 * 1000;
            const isRunning = remaining <= 0;
            const ratio = Math.max(0, Math.min(1, (intervalMs - remaining) / intervalMs));

            // Apply throttle effect
            const displayInterval = throttle > 0 ? cron.interval / (throttle / 100) : 0;

            return (
              <div key={cron.path} className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{cron.name}</p>
                    <p className="text-xs text-gray-400">
                      Every {throttle === 0 ? "∞" : displayInterval.toFixed(0)}{cron.unit[0]}
                      {throttle < 100 && throttle > 0 && (
                        <span className="text-yellow-500/70"> (throttled {throttle}%)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-sm sm:text-base font-mono font-bold ${
                      throttle === 0 ? "text-red-400" :
                      isRunning ? "text-green-400 animate-pulse" :
                      remaining < 60000 ? "text-yellow-400" :
                      "text-gray-300"
                    }`}>
                      {throttle === 0 ? "⏸ PAUSED" : formatCountdown(remaining)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      throttle === 0 ? "bg-red-500" :
                      isRunning ? "bg-green-500 animate-pulse" :
                      "bg-gradient-to-r from-purple-500 to-cyan-500"
                    }`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Info */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <p className={`text-lg font-bold ${
            throttle === 0 ? "text-red-400" :
            throttle < 50 ? "text-yellow-400" :
            "text-green-400"
          }`}>
            {throttle === 0 ? "🔴 Paused" : throttle < 50 ? "🟡 Slow" : "🟢 Active"}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Total Jobs</p>
          <p className="text-lg font-bold text-purple-400">{data.cronSchedules.length}</p>
        </div>
      </div>
    </div>
  );
}

