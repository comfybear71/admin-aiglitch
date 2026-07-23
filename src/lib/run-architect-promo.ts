import type { Dispatch, SetStateAction } from "react";

export type SpreadResult = { platform: string; status: string; url?: string; error?: string };
export type PromoMediaMode = "image" | "video10" | "video30";
export type PromoCampaign = "glitch" | "ecosystem";

const API_PATH = "/api/admin/promote-glitchcoin";

export const PROMO_MEDIA_MODES: { id: PromoMediaMode; label: string; icon: string }[] = [
  { id: "image", label: "Image", icon: "🖼️" },
  { id: "video10", label: "10s Video", icon: "🎬" },
  { id: "video30", label: "30s Extended (3 clips)", icon: "⏱️" },
];

function mediaModeLabel(mode: PromoMediaMode): string {
  return PROMO_MEDIA_MODES.find((m) => m.id === mode)?.label ?? mode;
}

function mediaModeToApi(mode: PromoMediaMode): {
  apiMode: "image" | "video";
  extend30s: boolean;
  previewMode: "image" | "video";
} {
  if (mode === "image") return { apiMode: "image", extend30s: false, previewMode: "image" };
  if (mode === "video30") return { apiMode: "video", extend30s: true, previewMode: "video" };
  return { apiMode: "video", extend30s: false, previewMode: "video" };
}

async function readAdminJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text.trim().slice(0, 300) || `HTTP ${res.status}`);
  }
}

async function pollSpreadStatus(
  postId: string,
  onUpdate: (results: SpreadResult[]) => void,
): Promise<{ results: SpreadResult[]; timedOut: boolean }> {
  const deadline = Date.now() + 600_000;
  let lastResults: SpreadResult[] = [];
  while (Date.now() < deadline) {
    const res = await fetch(
      `${API_PATH}?action=spread_status&post_id=${encodeURIComponent(postId)}`,
    );
    const data = await readAdminJson(res);
    const results = (Array.isArray(data.spreadResults) ? data.spreadResults : []) as SpreadResult[];
    lastResults = results;
    onUpdate(results);
    if (data.complete) {
      return { results, timedOut: false };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return { results: lastResults, timedOut: true };
}

async function pollPromoImageJob(
  jobId: string,
  onTick?: () => void,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 300_000;
  let polls = 0;
  while (Date.now() < deadline) {
    polls += 1;
    if (polls > 1 && polls % 8 === 0) onTick?.();
    const res = await fetch(
      `${API_PATH}?action=image_status&job_id=${encodeURIComponent(jobId)}`,
    );
    const data = await readAdminJson(res);
    if (data.phase === "done") return data;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Image generation timed out after 5 minutes");
}

function summarizeSpreadLog(results: SpreadResult[]): string {
  if (results.length === 0) {
    return "No active social media accounts configured";
  }
  const posted = results.filter((r) => r.status === "posted").length;
  const failed = results.filter((r) => r.status === "failed").length;
  return `Sent to ${posted} platform${posted !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`;
}

export interface RunArchitectPromoParams {
  campaign: PromoCampaign;
  mediaMode: PromoMediaMode;
  style: string;
  concept: string;
  customPrompt: string | null;
  subjectLabel: string;
  doneMessage: string;
  isRunning: boolean;
  setRunning: (v: boolean) => void;
  setLog: Dispatch<SetStateAction<string[]>>;
  setSpreadResults: Dispatch<SetStateAction<SpreadResult[]>>;
  setComplete: (v: boolean) => void;
  setImageUrl: (v: string | null) => void;
  setVideoUrl?: (v: string | null) => void;
  setPhase?: (v: string) => void;
}

export async function runArchitectPromo(params: RunArchitectPromoParams): Promise<void> {
  const {
    campaign,
    mediaMode,
    style,
    concept,
    customPrompt,
    subjectLabel,
    doneMessage,
    isRunning,
    setRunning,
    setLog,
    setSpreadResults,
    setComplete,
    setImageUrl,
    setVideoUrl,
    setPhase,
  } = params;

  if (isRunning) return;

  const { apiMode, extend30s, previewMode } = mediaModeToApi(mediaMode);
  const campaignParam = campaign === "ecosystem" ? "ecosystem" : "glitch";

  setRunning(true);
  setLog([`Generating ${subjectLabel} — ${mediaModeLabel(mediaMode)}...`]);
  if (style !== "auto") setLog((prev) => [...prev, `🎨 Style: ${style}`]);
  if (concept.trim()) {
    setLog((prev) => [
      ...prev,
      `💡 Concept: "${concept.trim().slice(0, 80)}${concept.trim().length > 80 ? "…" : ""}"`,
    ]);
  }
  setSpreadResults([]);
  setComplete(false);
  setImageUrl(null);
  setVideoUrl?.(null);
  setPhase?.(mediaMode === "video30" ? "submitting 3 clips" : apiMode === "video" ? "rendering" : "image");

  try {
    const form = new FormData();
    form.append("mode", apiMode);
    form.append("campaign", campaignParam);
    if (style !== "auto") form.append("style", style);
    if (concept.trim()) form.append("concept", concept.trim());
    if (extend30s) form.append("extend_30s", "true");
    if (customPrompt) form.append("prompt", customPrompt);

    const res = await fetch(API_PATH, { method: "POST", body: form });
    const data = await readAdminJson(res);

    if (apiMode === "image") {
      let imageData = data;
      if (data.phase === "submitted" && typeof data.jobId === "string") {
        setLog((prev) => [...prev, "⏳ Rendering image with Grok..."]);
        try {
          imageData = await pollPromoImageJob(data.jobId, () => {
            setLog((prev) => [...prev, "🔄 Still rendering image..."]);
          });
        } catch (err) {
          setLog((prev) => [...prev, `❌ ${err instanceof Error ? err.message : String(err)}`]);
          setRunning(false);
          return;
        }
      }

      if (imageData.success && typeof imageData.imageUrl === "string") {
        setImageUrl(imageData.imageUrl);
        setLog((prev) => [...prev, "✅ Image generated!"]);
        if (imageData.spreadPending && typeof imageData.postId === "string") {
          setLog((prev) => [...prev, "📡 Sending to socials..."]);
          const poll = await pollSpreadStatus(imageData.postId, setSpreadResults);
          setLog((prev) => [...prev, `📡 ${summarizeSpreadLog(poll.results)}`]);
          if (poll.timedOut) {
            setLog((prev) => [...prev, "⏳ Spread still running — check Activity for final status"]);
          }
        } else if (Array.isArray(imageData.spreadResults) && imageData.spreadResults.length > 0) {
          setSpreadResults(imageData.spreadResults as SpreadResult[]);
          setLog((prev) => [...prev, `📡 ${summarizeSpreadLog(imageData.spreadResults as SpreadResult[])}`]);
        }
        setLog((prev) => [...prev, doneMessage]);
        setComplete(true);
      } else {
        setLog((prev) => [...prev, `❌ ${String(imageData.error || "Generation failed")}`]);
      }
      setRunning(false);
      return;
    }

    const finishVideo = async (pollData: Record<string, unknown>) => {
      if (typeof pollData.videoUrl === "string") setVideoUrl?.(pollData.videoUrl);
      if (typeof pollData.duration === "number" && pollData.duration > 10) {
        setLog((prev) => [
          ...prev,
          `🎉 ${pollData.clipCount || 3}-clip video ready! (${pollData.duration}s)`,
        ]);
      } else {
        setLog((prev) => [...prev, "🎉 Video ready!"]);
      }
      if (pollData.spreadPending && typeof pollData.postId === "string") {
        setLog((prev) => [...prev, "📡 Sending to socials..."]);
        const poll = await pollSpreadStatus(pollData.postId, setSpreadResults);
        setLog((prev) => [...prev, `📡 ${summarizeSpreadLog(poll.results)}`]);
        if (poll.timedOut) {
          setLog((prev) => [...prev, "⏳ Spread still running — check Activity for final status"]);
        }
      } else if (Array.isArray(pollData.spreadResults) && pollData.spreadResults.length > 0) {
        setSpreadResults(pollData.spreadResults as SpreadResult[]);
        setLog((prev) => [...prev, `📡 ${summarizeSpreadLog(pollData.spreadResults as SpreadResult[])}`]);
      }
      setLog((prev) => [...prev, doneMessage]);
      setComplete(true);
    };

    const campaignQuery = `&campaign=${encodeURIComponent(campaignParam)}`;

    if (data.phase === "done" && data.success) {
      await finishVideo(data);
      setRunning(false);
      return;
    }

    const requestIds = Array.isArray(data.requestIds)
      ? (data.requestIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    if (requestIds.length > 0) {
      setLog((prev) => [...prev, `✅ ${requestIds.length} clips submitted! Polling in parallel...`]);
      setPhase?.("rendering 3 clips");
      const idsParam = requestIds.join(",");
      for (let attempt = 1; attempt <= 90; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        try {
          const pollRes = await fetch(
            `${API_PATH}?ids=${encodeURIComponent(idsParam)}${campaignQuery}`,
          );
          const pollData = await readAdminJson(pollRes);
          if (pollData.phase === "done" && pollData.success) {
            await finishVideo(pollData);
            setRunning(false);
            return;
          }
          if (pollData.phase === "stitching") {
            setPhase?.("stitching 30s video");
            if (attempt % 2 === 0) {
              setLog((prev) => [...prev, "🧵 All clips ready — stitching 30s video..."]);
            }
          }
          if (pollData.phase === "done") {
            setLog((prev) => [
              ...prev,
              `❌ ${String(pollData.error || pollData.status || "All clips failed")}`,
            ]);
            setRunning(false);
            return;
          }
          if (attempt % 2 === 0 && pollData.completed !== undefined) {
            setPhase?.(`clips ${pollData.completed}/${pollData.total} done`);
            setLog((prev) => [...prev, `🔄 Clips ${pollData.completed}/${pollData.total} ready...`]);
          }
        } catch {
          /* retry */
        }
      }
      setLog((prev) => [...prev, "❌ Timed out after 15 minutes"]);
      setRunning(false);
      return;
    }

    if (!data.success || typeof data.requestId !== "string") {
      setLog((prev) => [...prev, `❌ Submit failed: ${String(data.error || "Unknown error")}`]);
      setRunning(false);
      return;
    }

    setLog((prev) => [...prev, "✅ Video submitted! Polling for completion..."]);
    const requestId = data.requestId;

    for (let attempt = 1; attempt <= 90; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      try {
        const pollRes = await fetch(
          `${API_PATH}?id=${encodeURIComponent(requestId)}${campaignQuery}`,
        );
        const pollData = await readAdminJson(pollRes);

        if (pollData.phase === "done" && pollData.success) {
          await finishVideo(pollData);
          setRunning(false);
          return;
        }

        if (
          pollData.status === "moderation_failed" ||
          pollData.status === "expired" ||
          pollData.status === "failed"
        ) {
          setLog((prev) => [...prev, `❌ Video ${pollData.status}`]);
          setRunning(false);
          return;
        }

        if (attempt % 3 === 0) {
          setLog((prev) => [...prev, `🔄 Still generating... (${pollData.status || "pending"})`]);
        }
      } catch {
        /* retry */
      }
    }
    setLog((prev) => [...prev, "❌ Timed out after 15 minutes"]);
  } catch (err) {
    setLog((prev) => [...prev, `❌ Error: ${err instanceof Error ? err.message : String(err)}`]);
  }
  setRunning(false);
}

export function buildPromoPreviewUrl(
  campaign: PromoCampaign,
  mediaMode: PromoMediaMode,
  style: string,
  concept: string,
): string {
  const { previewMode } = mediaModeToApi(mediaMode);
  const params = new URLSearchParams({
    action: "preview_prompt",
    mode: previewMode,
    style,
    campaign: campaign === "ecosystem" ? "ecosystem" : "glitch",
  });
  if (concept.trim()) params.set("concept", concept.trim());
  return `${API_PATH}?${params.toString()}`;
}

export { mediaModeLabel, mediaModeToApi, summarizeSpreadLog };
