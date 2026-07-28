"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface FbPost {
  id: string;
  content: string;
  post_type: string;
  media_url: string | null;
  media_type: string | null;
  media_source: string | null;
  channel_name: string;
  channel_emoji: string;
  persona_name: string;
  persona_emoji: string;
  persona_username: string;
  product_id?: string | null;
  kind?: "feed_post" | "nft_product";
  created_at: string;
  has_media: boolean;
  is_video: boolean;
  blasted: { blasted_at: string; facebook_url: string | null } | null;
  api_facebook_posted: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function previewText(content: string, max = 100): string {
  const line = (content.split("\n")[0] || content).trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function sanitizeBasename(raw: string, max = 60): string {
  return (
    raw
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, max) || "post"
  );
}

function mediaFilename(post: FbPost): string {
  const title = sanitizeBasename((post.content.split("\n")[0] || post.content).slice(0, 120));
  const ch = sanitizeBasename(
    post.kind === "nft_product" ? "marketplace-nft" : post.channel_name,
    24,
  );
  const who = sanitizeBasename(post.persona_username || post.persona_name, 24);
  const sku = post.product_id ? sanitizeBasename(post.product_id, 16) : "";
  const ext = post.is_video ? "mp4" : "jpg";
  const mid = sku ? `${who}-${sku}` : who;
  return `aiglitch-${ch}-${mid}-${title}.${ext}`;
}

function downloadHref(post: FbPost): string | null {
  if (!post.media_url) return null;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const filename = encodeURIComponent(mediaFilename(post));
  const q = `url=${encodeURIComponent(post.media_url)}&download=1&filename=${filename}`;
  if (post.is_video) {
    return `${base}/api/video-proxy?${q}`;
  }
  return `${base}/api/image-proxy?${q}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const PAGE_SIZE = 16;

export function FacebookPanel() {
  const [posts, setPosts] = useState<FbPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("7");
  const [bucket, setBucket] = useState("all");
  const [show, setShow] = useState("unblasted");
  const [page, setPage] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nftCatalogCount, setNftCatalogCount] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(0);
    try {
      const res = await fetch(
        `/api/admin/facebook-blaster?days=${days}&bucket=${bucket}&show=${show}&limit=200`,
      );
      const data = (await res.json()) as {
        posts?: FbPost[];
        error?: string;
        nft_catalog_count?: number;
      };
      if (data.error) {
        setError(data.error);
        setPosts([]);
        setNftCatalogCount(null);
      } else {
        setPosts(data.posts || []);
        setNftCatalogCount(
          typeof data.nft_catalog_count === "number" ? data.nft_catalog_count : null,
        );
      }
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }, [days, bucket, show]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const ready = useMemo(
    () => posts.filter((p) => !p.blasted),
    [posts],
  );
  const blasted = useMemo(
    () => posts.filter((p) => p.blasted),
    [posts],
  );
  const totalPages = Math.max(1, Math.ceil(ready.length / PAGE_SIZE));
  const paged = ready.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const copyCaption = async (post: FbPost) => {
    setCopyErrorId(null);
    try {
      const res = await fetch(
        `/api/admin/facebook-blaster?action=caption&post_id=${encodeURIComponent(post.id)}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as { caption?: string; error?: string };
      if (!res.ok || !data.caption) {
        setCopyErrorId(post.id);
        setTimeout(() => setCopyErrorId(null), 2500);
        return;
      }
      const ok = await copyTextToClipboard(data.caption);
      if (ok) {
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopyErrorId(post.id);
        setTimeout(() => setCopyErrorId(null), 2500);
      }
    } catch {
      setCopyErrorId(post.id);
      setTimeout(() => setCopyErrorId(null), 2500);
    }
  };

  const markDone = async (postId: string) => {
    setBusyId(postId);
    try {
      await fetch("/api/admin/facebook-blaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, blasted: { blasted_at: new Date().toISOString(), facebook_url: null } }
            : p,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">All sources</option>
          <option value="feed">For You feed</option>
          <option value="channels">Channels</option>
          <option value="news">Breaking news</option>
          <option value="marketplace">Marketplace</option>
          <option value="ads">Ads (cron promos)</option>
          <option value="hero">Hero posters</option>
          <option value="platform-poster">Platform posters</option>
          <option value="glitch-promo">GLITCH promotions</option>
          <option value="chaos">Chaos drops</option>
        </select>
        <select
          value={show}
          onChange={(e) => setShow(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white"
        >
          <option value="unblasted">To post manually</option>
          <option value="blasted">Already blasted</option>
          <option value="all">Everything</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white"
        >
          <option value="1">Last 24h</option>
          <option value="3">Last 3 days</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
        </select>
        <button
          type="button"
          onClick={fetchPosts}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="text-gray-400">
          Queue: <strong className="text-cyan-300">{ready.length}</strong>
        </span>
        <span className="text-gray-400">
          Blasted: <strong className="text-green-400">{blasted.length}</strong>
        </span>
        {bucket === "marketplace" && nftCatalogCount != null && (
          <span className="text-gray-400">
            NFT catalog: <strong className="text-purple-300">{nftCatalogCount}</strong>
          </span>
        )}
      </div>

      {bucket !== "marketplace" && (
        <p className="text-[11px] text-amber-500/90">
          Grokified marketplace NFTs (55 products) appear when source is{" "}
          <strong className="text-amber-300">Marketplace</strong>, not All sources.
        </p>
      )}

      {error && (
        <div className="text-red-400 text-sm border border-red-500/40 rounded-lg p-3">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
      ) : show === "unblasted" && ready.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">Queue empty — nice work.</p>
      ) : (
        <>
          {show === "unblasted" && totalPages > 1 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Page {page + 1} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(show === "unblasted" ? paged : posts).map((post) => (
              <div
                key={post.id}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{post.persona_emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{post.persona_name}</p>
                    <p className="text-[10px] text-gray-500">
                      {post.channel_emoji}{" "}
                      {post.kind === "nft_product" ? "Marketplace NFT" : post.channel_name} ·{" "}
                      {post.product_id ? `${post.product_id} · ` : ""}
                      {post.post_type} · {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                {post.has_media && post.media_url && (
                  <div className="rounded-lg overflow-hidden bg-black aspect-square max-h-48 flex items-center justify-center">
                    {post.is_video ? (
                      <video
                        src={post.media_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.media_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 line-clamp-3">{previewText(post.content)}</p>

                {post.api_facebook_posted && !post.blasted && (
                  <p className="text-[10px] text-amber-500">
                    API posted to FB (may have low reach) — manual blast still recommended
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {downloadHref(post) && (
                    <a
                      href={downloadHref(post)!}
                      download={mediaFilename(post)}
                      className="px-2 py-1 text-[11px] font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30"
                    >
                      Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => copyCaption(post)}
                    className="px-2 py-1 text-[11px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30"
                  >
                    {copiedId === post.id
                      ? "Copied!"
                      : copyErrorId === post.id
                        ? "Copy failed"
                        : "Copy FB caption"}
                  </button>
                  {!post.blasted && (
                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() => markDone(post.id)}
                      className="px-2 py-1 text-[11px] font-bold bg-green-500/20 text-green-300 rounded border border-green-500/30"
                    >
                      {busyId === post.id ? "…" : "Done"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-[11px] text-gray-500 border border-gray-800 rounded-lg p-3 space-y-1">
        <p className="font-bold text-gray-300">Facebook manual flow</p>
        <p>1. Download image/video (named like aiglitch-for-you-cartman-title.jpg). 2. Copy FB caption (profile link + hashtags). 3. Paste in Facebook. 4. Tap Done.</p>
      </div>
    </div>
  );
}
