"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

import { PipelinesTab } from "./pipelines-tab";

interface CatalogPromptField {
  category: string;
  key: string;
  label: string;
  value: string;
  default: string;
  overridden: boolean;
}

interface ChannelGroup {
  channelId: string;
  channelName: string;
  emoji: string;
  prompts: CatalogPromptField[];
}

interface DirectorGroup {
  directorUsername: string;
  directorName: string;
  prompts: CatalogPromptField[];
}

interface GenreGroup {
  genreKey: string;
  genreName: string;
  emoji: string;
  prompts: CatalogPromptField[];
}

interface PlatformGroup {
  prompts: CatalogPromptField[];
}

interface EditingPrompt {
  category: string;
  key: string;
  label: string;
  value: string;
}

type TabId = "channels" | "directors" | "genres" | "platform" | "pipelines";

function fieldLabel(label: string): string {
  const parts = label.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : label;
}

export function PromptsClient() {
  const { authenticated } = useAdmin();
  const [channels, setChannels] = useState<ChannelGroup[]>([]);
  const [directors, setDirectors] = useState<DirectorGroup[]>([]);
  const [genres, setGenres] = useState<GenreGroup[]>([]);
  const [platform, setPlatform] = useState<PlatformGroup[]>([]);
  const [overrideCount, setOverrideCount] = useState(0);
  const [pipelineCount, setPipelineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<EditingPrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("channels");

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/prompts");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErr(data.error || "Failed to load prompts");
        return;
      }
      const data = (await res.json()) as {
        channels?: ChannelGroup[];
        directors?: DirectorGroup[];
        genres?: GenreGroup[];
        platform?: PlatformGroup[];
        overrideCount?: number;
      };
      setChannels(data.channels || []);
      setDirectors(data.directors || []);
      setGenres(data.genres || []);
      setPlatform(data.platform || []);
      setOverrideCount(data.overrideCount || 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/admin/prompts/pipelines")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pipelines?: unknown[] } | null) => {
        if (data?.pipelines) setPipelineCount(data.pipelines.length);
      })
      .catch(() => undefined);
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) void fetchPrompts();
  }, [authenticated, fetchPrompts]);

  const savePrompt = async () => {
    if (!editingPrompt) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          category: editingPrompt.category,
          key: editingPrompt.key,
          label: editingPrompt.label,
          value: editingPrompt.value,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "Save failed");
        return;
      }
      setEditingPrompt(null);
      await fetchPrompts();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetPrompt = async (field: CatalogPromptField) => {
    if (
      !confirm(
        "Reset this prompt to the hardcoded default? Your custom version will be deleted.",
      )
    ) {
      return;
    }
    setErr(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          category: field.category,
          key: field.key,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "Reset failed");
        return;
      }
      await fetchPrompts();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    }
  };

  if (!authenticated) return null;

  const platformFields = platform.flatMap((g) => g.prompts);

  const tabBtn = (id: TabId, label: string, count: number, activeClass: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
        tab === id
          ? activeClass
          : "bg-gray-800 text-gray-400 hover:text-white"
      }`}
    >
      {label} ({count})
    </button>
  );

  const renderPromptFields = (
    prompts: CatalogPromptField[],
    accentBorder: string,
    accentBadge: string,
    previewMaxHeight = "max-h-24",
  ) => (
    <div className="px-4 pb-4 space-y-3">
      {prompts.map((p) => (
        <div
          key={`${p.category}:${p.key}`}
          className={`bg-gray-800/50 rounded-lg p-3 border ${
            p.overridden ? accentBorder : "border-gray-700/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-gray-300 truncate">
                {fieldLabel(p.label)}
              </span>
              {p.overridden && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${accentBadge}`}
                >
                  custom
                </span>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setEditingPrompt({
                    category: p.category,
                    key: p.key,
                    label: p.label,
                    value: p.value,
                  })
                }
                className="px-2 py-0.5 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded"
              >
                Edit
              </button>
              {p.overridden && (
                <button
                  type="button"
                  onClick={() => resetPrompt(p)}
                  className="px-2 py-0.5 text-[10px] text-orange-400 hover:text-orange-300 bg-orange-500/10 rounded"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <pre
            className={`text-[11px] text-gray-400 whitespace-pre-wrap overflow-y-auto bg-gray-900/50 p-2 rounded ${previewMaxHeight}`}
          >
            {p.value || "(empty)"}
          </pre>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            AI Prompt Editor
          </h2>
          <p className="text-xs text-gray-500">
            Edit prompts that drive AI content generation. Changes take effect on
            next generation — no deploy needed.
          </p>
        </div>
        {overrideCount > 0 && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
            {overrideCount} custom override{overrideCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {err && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {tabBtn(
          "channels",
          "Channels",
          channels.length,
          "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
        )}
        {tabBtn(
          "directors",
          "Directors",
          directors.length,
          "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        )}
        {tabBtn(
          "genres",
          "Genres",
          genres.length,
          "bg-green-500/20 text-green-400 border border-green-500/30",
        )}
        {tabBtn(
          "platform",
          "Platform",
          platformFields.length,
          "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        )}
        {tabBtn(
          "pipelines",
          "Pipelines",
          pipelineCount,
          "bg-rose-500/20 text-rose-400 border border-rose-500/30",
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl animate-pulse mb-2">{"\u{1F4DD}"}</div>
          <p>Loading prompts...</p>
        </div>
      ) : (
        <>
          {tab === "channels" && (
            <div className="space-y-2">
              {channels.length === 0 ? (
                <p className="text-sm text-gray-500 px-1">No channels in database.</p>
              ) : (
                channels.map((ch) => (
                  <div
                    key={ch.channelId}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroup(
                          expandedGroup === ch.channelId ? null : ch.channelId,
                        )
                      }
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs transition-transform ${
                            expandedGroup === ch.channelId ? "rotate-90" : ""
                          }`}
                        >
                          &#9654;
                        </span>
                        <span className="text-lg">{ch.emoji}</span>
                        <span className="font-bold text-sm text-white">
                          {ch.channelName}
                        </span>
                        {ch.prompts.some((p) => p.overridden) && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                            customized
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {ch.prompts.length} prompts
                      </span>
                    </button>
                    {expandedGroup === ch.channelId &&
                      renderPromptFields(
                        ch.prompts,
                        "border-purple-500/30",
                        "bg-purple-500/20 text-purple-400",
                      )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "directors" && (
            <div className="space-y-2">
              {directors.map((d) => (
                <div
                  key={d.directorUsername}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroup(
                        expandedGroup === d.directorUsername
                          ? null
                          : d.directorUsername,
                      )
                    }
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs transition-transform ${
                          expandedGroup === d.directorUsername ? "rotate-90" : ""
                        }`}
                      >
                        &#9654;
                      </span>
                      <span className="text-lg">{"\u{1F3AC}"}</span>
                      <span className="font-bold text-sm text-white">
                        {d.directorName}
                      </span>
                      {d.prompts.some((p) => p.overridden) && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                          customized
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {d.prompts.length} prompts
                    </span>
                  </button>
                  {expandedGroup === d.directorUsername &&
                    renderPromptFields(
                      d.prompts,
                      "border-purple-500/30",
                      "bg-purple-500/20 text-purple-400",
                    )}
                </div>
              ))}
            </div>
          )}

          {tab === "genres" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 px-1">
                Genre templates control cinematic style, mood, lighting, and
                screenplay instructions for AIG!itch Studios movies.
              </p>
              {genres.map((g) => (
                <div
                  key={g.genreKey}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroup(
                        expandedGroup === g.genreKey ? null : g.genreKey,
                      )
                    }
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs transition-transform ${
                          expandedGroup === g.genreKey ? "rotate-90" : ""
                        }`}
                      >
                        &#9654;
                      </span>
                      <span className="text-lg">{g.emoji}</span>
                      <span className="font-bold text-sm text-white">
                        {g.genreName}
                      </span>
                      {g.prompts.some((p) => p.overridden) && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          customized
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {g.prompts.length} fields
                    </span>
                  </button>
                  {expandedGroup === g.genreKey &&
                    renderPromptFields(
                      g.prompts,
                      "border-green-500/30",
                      "bg-green-500/20 text-green-400",
                    )}
                </div>
              ))}
            </div>
          )}

          {tab === "platform" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 px-1">
                Injected into every persona Telegram chat via the platform brief
                system.
              </p>
              {platformFields.length === 0 ? (
                <p className="text-sm text-gray-500 px-1">No platform prompts.</p>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-4">
                  {renderPromptFields(
                    platformFields,
                    "border-amber-500/30",
                    "bg-amber-500/20 text-amber-400",
                    "min-h-[28rem] max-h-[70vh]",
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "pipelines" && <PipelinesTab />}
        </>
      )}

      {editingPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-cyan-400">
                {editingPrompt.label}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrompt(null)}
                className="text-gray-500 hover:text-white text-lg"
              >
                {"\u{2715}"}
              </button>
            </div>
            <textarea
              value={editingPrompt.value}
              onChange={(e) =>
                setEditingPrompt({ ...editingPrompt, value: e.target.value })
              }
              rows={editingPrompt.category === "platform" ? 24 : 12}
              className={`w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500 resize-y ${
                editingPrompt.category === "platform" ? "min-h-[28rem]" : ""
              }`}
              placeholder="Enter prompt text..."
            />
            <div className="flex justify-between items-center mt-3 gap-2 flex-wrap">
              <p className="text-[10px] text-gray-500">
                Changes take effect on next content generation — no deploy needed
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(null)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePrompt}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-xs hover:bg-green-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Prompt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
