"use client";
import { useState, useCallback, useEffect } from "react";

interface PromptViewerProps {
  /** Function that fetches the prompt preview from the API */
  fetchPrompt: () => Promise<string>;
  /** Called when the user edits the prompt — parent stores the override */
  onPromptChange?: (prompt: string | null) => void;
  /** Current custom prompt override (controlled) */
  customPrompt?: string | null;
  /** Label for the button */
  label?: string;
  /** Accent color class for borders/text */
  accent?: string;
  /** Whether generation is in progress (disables editing) */
  disabled?: boolean;
  /** Start expanded (shows prompt textarea immediately) */
  defaultOpen?: boolean;
  /** When this value changes, refetch the prompt (e.g. style|mode|concept) */
  reloadKey?: string;
  /**
   * When set, shows Save / Load draft library for this collection
   * (elon | ad | promo | poster | hero | …).
   */
  libraryCollection?: string;
}

interface LibraryListItem {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  stale: boolean;
}

const ACCENT_STYLES: Record<string, { border: string; text: string; bg: string }> = {
  orange: {
    border: "border-orange-500/30",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  green: {
    border: "border-green-500/30",
    text: "text-green-400",
    bg: "bg-green-500/10",
  },
  yellow: {
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  pink: {
    border: "border-pink-500/30",
    text: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  blue: {
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
};

export default function PromptViewer({
  fetchPrompt,
  onPromptChange,
  customPrompt,
  label = "Prompt",
  accent = "orange",
  disabled = false,
  defaultOpen = false,
  reloadKey,
  libraryCollection,
}: PromptViewerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [drafts, setDrafts] = useState<LibraryListItem[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryMsg, setLibraryMsg] = useState<string | null>(null);

  const accentStyles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.orange;

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = await fetchPrompt();
      setOriginalPrompt(prompt);
      setEditedPrompt(prompt);
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompt");
    }
    setLoading(false);
  }, [fetchPrompt]);

  const refreshDrafts = useCallback(async () => {
    if (!libraryCollection) return;
    try {
      const res = await fetch(
        `/api/admin/prompt-library?collection=${encodeURIComponent(libraryCollection)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { drafts?: LibraryListItem[] };
      setDrafts(data.drafts ?? []);
    } catch {
      // non-fatal
    }
  }, [libraryCollection]);

  useEffect(() => {
    if (libraryCollection) void refreshDrafts();
  }, [libraryCollection, refreshDrafts]);

  const handleToggle = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (originalPrompt) return;
    await loadPrompt();
  }, [open, originalPrompt, loadPrompt]);

  const handleEdit = (value: string) => {
    setEditedPrompt(value);
    if (onPromptChange) {
      onPromptChange(value !== originalPrompt ? value : null);
    }
  };

  const handleReset = () => {
    if (originalPrompt) {
      setEditedPrompt(originalPrompt);
      if (onPromptChange) onPromptChange(null);
    }
  };

  const handleRefresh = async () => {
    await loadPrompt();
    if (onPromptChange) onPromptChange(null);
  };

  const applyLoadedValue = (value: string) => {
    setEditedPrompt(value);
    if (onPromptChange) {
      onPromptChange(value !== originalPrompt ? value : null);
    }
  };

  const handleSaveDraft = async () => {
    if (!libraryCollection) return;
    const value = (editedPrompt ?? customPrompt ?? "").trim();
    if (!value) {
      setLibraryMsg("Nothing to save — open/edit the prompt first");
      return;
    }
    setLibraryBusy(true);
    setLibraryMsg(null);
    try {
      const res = await fetch("/api/admin/prompt-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          collection: libraryCollection,
          value,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; draft?: { title: string }; error?: string };
      if (!res.ok || !data.ok) {
        setLibraryMsg(data.error || "Save failed");
        return;
      }
      setLibraryMsg(`Saved “${data.draft?.title ?? "draft"}”`);
      await refreshDrafts();
    } catch {
      setLibraryMsg("Save failed");
    } finally {
      setLibraryBusy(false);
    }
  };

  const handleLoadDraft = async () => {
    if (!selectedDraftId) return;
    setLibraryBusy(true);
    setLibraryMsg(null);
    try {
      const res = await fetch(
        `/api/admin/prompt-library?id=${encodeURIComponent(selectedDraftId)}`,
      );
      const data = (await res.json()) as { draft?: { value: string; title: string }; error?: string };
      if (!res.ok || !data.draft) {
        setLibraryMsg(data.error || "Load failed");
        return;
      }
      applyLoadedValue(data.draft.value);
      setOpen(true);
      setLibraryMsg(`Loaded “${data.draft.title}”`);
    } catch {
      setLibraryMsg("Load failed");
    } finally {
      setLibraryBusy(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraftId) return;
    if (!confirm("Delete this saved prompt draft?")) return;
    setLibraryBusy(true);
    setLibraryMsg(null);
    try {
      const res = await fetch("/api/admin/prompt-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: selectedDraftId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setLibraryMsg(data.error || "Delete failed");
        return;
      }
      setSelectedDraftId("");
      setLibraryMsg("Draft deleted");
      await refreshDrafts();
    } catch {
      setLibraryMsg("Delete failed");
    } finally {
      setLibraryBusy(false);
    }
  };

  const isEdited = editedPrompt !== null && editedPrompt !== originalPrompt;

  useEffect(() => {
    const shouldLoad = open || defaultOpen;
    if (!shouldLoad) return;
    if (customPrompt) return;

    const delay = hasLoadedOnce ? 350 : 0;
    const timer = window.setTimeout(() => {
      void loadPrompt();
      if (hasLoadedOnce && onPromptChange) onPromptChange(null);
    }, delay);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, open, defaultOpen, customPrompt, hasLoadedOnce]);

  // If parent already has a custom prompt (e.g. just loaded), keep textarea in sync when opening
  useEffect(() => {
    if (customPrompt && editedPrompt === null) {
      setEditedPrompt(customPrompt);
    }
  }, [customPrompt, editedPrompt]);

  return (
    <div className="w-full space-y-2">
      {libraryCollection && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-700/50 bg-gray-900/60 px-2 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
            Library
          </span>
          <select
            value={selectedDraftId}
            onChange={(e) => setSelectedDraftId(e.target.value)}
            disabled={disabled || libraryBusy}
            className="min-w-0 flex-1 max-w-[220px] px-2 py-1 bg-black/40 border border-gray-700 rounded text-[10px] text-gray-200 disabled:opacity-40"
          >
            <option value="">Saved drafts…</option>
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.stale ? "⚠ " : ""}
                {d.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLoadDraft}
            disabled={disabled || libraryBusy || !selectedDraftId}
            className={`px-2 py-1 rounded text-[10px] font-bold border disabled:opacity-40 ${accentStyles.bg} ${accentStyles.text} ${accentStyles.border}`}
          >
            Load
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={disabled || libraryBusy}
            className="px-2 py-1 rounded text-[10px] font-bold border border-green-500/40 bg-green-500/10 text-green-400 disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={handleDeleteDraft}
            disabled={disabled || libraryBusy || !selectedDraftId}
            className="px-2 py-1 rounded text-[10px] font-bold border border-red-500/40 bg-red-500/10 text-red-400 disabled:opacity-40"
          >
            Del
          </button>
          {libraryMsg && (
            <span className="text-[9px] text-gray-400 w-full sm:w-auto">{libraryMsg}</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
          open
            ? `${accentStyles.bg} ${accentStyles.text} ${accentStyles.border}`
            : `bg-gray-800/60 text-gray-300 border-gray-600/40 hover:border-gray-500/60 hover:text-white`
        } disabled:opacity-40`}
      >
        <span className="flex items-center gap-1.5">
          <span>{open ? "▼" : "▶"}</span>
          <span>👁 {label}</span>
          {isEdited && <span className="text-yellow-400">(edited)</span>}
          {customPrompt && !open && <span className="text-yellow-400">(custom)</span>}
        </span>
        <span className="text-[9px] font-normal text-gray-500">
          {open ? "Hide" : "Show & edit"}
        </span>
      </button>

      {open && (
        <div className={`mt-0 rounded-lg border ${accentStyles.border} bg-black/30 overflow-hidden`}>
          {loading && (
            <div className="p-3 text-center">
              <span className={`text-[10px] ${accentStyles.text} animate-pulse`}>Loading prompt...</span>
            </div>
          )}
          {error && (
            <div className="p-3">
              <p className="text-[10px] text-red-400">{error}</p>
              <button onClick={handleRefresh} className="text-[10px] text-gray-400 underline mt-1">
                Retry
              </button>
            </div>
          )}
          {editedPrompt !== null && !loading && (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/50">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {isEdited && (
                    <button
                      onClick={handleReset}
                      className="text-[10px] text-gray-500 hover:text-white transition-colors"
                    >
                      ↩ Reset
                    </button>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              <textarea
                value={editedPrompt}
                onChange={(e) => handleEdit(e.target.value)}
                disabled={disabled}
                rows={Math.min(20, Math.max(4, editedPrompt.split("\n").length + 1))}
                className={`w-full px-3 py-2 bg-transparent text-[11px] font-mono text-gray-300 placeholder-gray-600 focus:outline-none resize-y disabled:opacity-50 leading-relaxed ${
                  isEdited ? "text-yellow-200" : ""
                }`}
              />
              {isEdited && (
                <div className="px-3 py-1.5 border-t border-gray-800/50">
                  <p className="text-[10px] text-yellow-400/70">
                    ✏️ Prompt has been edited — your version will be used instead of the default
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
