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
}: PromptViewerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
      // If user changed from original, pass the override; if reset to original, pass null
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

  const isEdited = editedPrompt !== null && editedPrompt !== originalPrompt;

  // Reload when style/mode/concept changes (debounced slightly so concept typing isn't noisy)
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
    // reloadKey drives refetch; loadPrompt identity changes when parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, open, defaultOpen, customPrompt, hasLoadedOnce]);

  return (
    <div className="w-full">
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
        <div className={`mt-2 rounded-lg border ${accentStyles.border} bg-black/30 overflow-hidden`}>
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
