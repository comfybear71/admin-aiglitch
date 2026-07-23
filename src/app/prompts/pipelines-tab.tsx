"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PipelinePreviewParam {
  key: string;
  label: string;
  type: "select" | "text";
  optional?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

interface PipelineEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sourceFile: string;
  cronSchedule?: string;
  adminPath: string;
  editHint: string;
  previewSupported: boolean;
  previewPath?: string;
  previewMethod?: "GET" | "POST";
  previewParams?: PipelinePreviewParam[];
  staticSamples?: Record<string, string>;
}

function extractPreviewText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.prompt === "string") return d.prompt;
  if (typeof d.renderedPrompt === "string") {
    let text = d.renderedPrompt;
    if (typeof d.renderedCaption === "string") {
      text += `\n\n--- CAPTION ---\n${d.renderedCaption}`;
    }
    if (d.scenario && typeof d.scenario === "object") {
      const s = d.scenario as Record<string, unknown>;
      text =
        `[Scenario: ${s.title ?? s.id} (${s.category ?? ""})]\n\n` + text;
    }
    if (typeof d.theme === "string") {
      text = `[Day ${d.dayNumber ?? "?"} — ${d.theme}]\n\n` + text;
    }
    return text;
  }
  return JSON.stringify(data, null, 2);
}

function defaultParamValues(params?: PipelinePreviewParam[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of params ?? []) {
    out[p.key] = p.defaultValue ?? "";
  }
  return out;
}

export function PipelinesTab() {
  const [pipelines, setPipelines] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [previewText, setPreviewText] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [staticPart, setStaticPart] = useState<Record<string, string>>({});

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/prompts/pipelines");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErr(data.error || "Failed to load pipelines");
        return;
      }
      const data = (await res.json()) as { pipelines?: PipelineEntry[] };
      const list = data.pipelines ?? [];
      setPipelines(list);
      const defaults: Record<string, Record<string, string>> = {};
      for (const p of list) {
        defaults[p.id] = defaultParamValues(p.previewParams);
        if (p.staticSamples) {
          setStaticPart((prev) => ({
            ...prev,
            [p.id]: Object.keys(p.staticSamples!)[0] ?? "intro",
          }));
        }
      }
      setParamValues(defaults);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const runPreview = async (pipeline: PipelineEntry) => {
    if (pipeline.staticSamples) {
      const part = staticPart[pipeline.id] ?? "intro";
      setPreviewText((prev) => ({
        ...prev,
        [pipeline.id]: pipeline.staticSamples![part] ?? "",
      }));
      return;
    }
    if (!pipeline.previewPath) return;

    setPreviewLoading(pipeline.id);
    setErr(null);
    try {
      const params = paramValues[pipeline.id] ?? {};
      const url = new URL(pipeline.previewPath, window.location.origin);
      for (const [key, value] of Object.entries(params)) {
        if (value.trim()) url.searchParams.set(key, value.trim());
      }
      const res = await fetch(url.toString(), {
        method: pipeline.previewMethod ?? "GET",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(
          (data as { error?: string }).error ||
            `Preview failed (${res.status})`,
        );
        return;
      }
      setPreviewText((prev) => ({
        ...prev,
        [pipeline.id]: extractPreviewText(data),
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl animate-pulse mb-2">{"\u{1F5FA}"}</div>
        <p>Loading pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 px-1">
        Content pipelines whose prompts live in code files. Preview costs nothing
        — edit the source file and deploy to change defaults. DB overrides for
        channels/directors/genres are on the other tabs.
      </p>

      {pipelines.map((p) => {
        const expanded = expandedId === p.id;
        const preview = previewText[p.id];
        const params = paramValues[p.id] ?? {};

        return (
          <div
            key={p.id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : p.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs transition-transform shrink-0 ${
                    expanded ? "rotate-90" : ""
                  }`}
                >
                  &#9654;
                </span>
                <span className="text-lg shrink-0">{p.emoji}</span>
                <span className="font-bold text-sm text-white truncate">
                  {p.name}
                </span>
                {p.previewSupported && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full shrink-0">
                    preview
                  </span>
                )}
              </div>
              <code className="text-[10px] text-gray-600 hidden sm:block truncate max-w-[40%]">
                {p.sourceFile}
              </code>
            </button>

            {expanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-800/80">
                <p className="text-xs text-gray-400 pt-3">{p.description}</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <dt className="text-gray-600">Source</dt>
                    <dd className="text-gray-300 font-mono">{p.sourceFile}</dd>
                  </div>
                  {p.cronSchedule && (
                    <div>
                      <dt className="text-gray-600">Schedule</dt>
                      <dd className="text-gray-300">{p.cronSchedule}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-gray-600">How to edit</dt>
                    <dd className="text-gray-400">{p.editHint}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={p.adminPath}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                  >
                    Open in admin →
                  </Link>
                  {p.previewSupported && (
                    <button
                      type="button"
                      onClick={() => runPreview(p)}
                      disabled={previewLoading === p.id}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      {previewLoading === p.id ? "Loading…" : "Preview prompt"}
                    </button>
                  )}
                </div>

                {p.staticSamples && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-gray-500">Part:</span>
                    {Object.keys(p.staticSamples).map((part) => (
                      <button
                        key={part}
                        type="button"
                        onClick={() => {
                          setStaticPart((prev) => ({ ...prev, [p.id]: part }));
                          setPreviewText((prev) => ({
                            ...prev,
                            [p.id]: p.staticSamples![part] ?? "",
                          }));
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded capitalize ${
                          (staticPart[p.id] ?? "intro") === part
                            ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            : "bg-gray-800 text-gray-400 border border-gray-700"
                        }`}
                      >
                        {part}
                      </button>
                    ))}
                  </div>
                )}

                {p.previewParams && p.previewParams.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.previewParams.map((param) => (
                      <label key={param.key} className="block">
                        <span className="text-[10px] text-gray-500 block mb-1">
                          {param.label}
                        </span>
                        {param.type === "select" ? (
                          <select
                            value={params[param.key] ?? ""}
                            onChange={(e) =>
                              setParamValues((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...prev[p.id],
                                  [param.key]: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                          >
                            {(param.options ?? []).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={params[param.key] ?? ""}
                            onChange={(e) =>
                              setParamValues((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...prev[p.id],
                                  [param.key]: e.target.value,
                                },
                              }))
                            }
                            placeholder={param.optional ? "Optional" : ""}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {preview && (
                  <pre className="text-[11px] text-gray-400 whitespace-pre-wrap min-h-[8rem] max-h-[28rem] overflow-y-auto bg-gray-950/80 border border-gray-800 rounded-lg p-3 font-mono">
                    {preview}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}

      {err && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
    </div>
  );
}
