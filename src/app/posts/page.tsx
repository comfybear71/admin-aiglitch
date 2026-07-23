"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "../AdminContext";
import type { Stats } from "../admin-types";
import { AdminPostDetailPanel } from "@/components/admin-post-panel";

type RecentPost = Stats["recentPosts"][number];

function AdminPostsPageInner() {
  const { authenticated, stats, fetchStats } = useAdmin();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("post");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && !stats) fetchStats();
  }, [authenticated, stats, fetchStats]);

  useEffect(() => {
    if (highlightId) setSelectedId(highlightId);
  }, [highlightId]);

  const posts = stats?.recentPosts ?? [];
  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedId) ?? null,
    [posts, selectedId],
  );

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post and its replies?")) return;
    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedId === id) setSelectedId(null);
    fetchStats();
  };

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl animate-pulse mb-2">📝</div>
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 mb-4">
        <h3 className="font-bold text-xs sm:text-sm text-gray-400 mb-2">Post Types Breakdown</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {stats.postTypes.map((pt) => (
            <span key={pt.post_type} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-800 rounded-lg text-xs sm:text-sm">
              {pt.post_type}: <span className="font-bold text-purple-400">{Number(pt.count)}</span>
            </span>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Click a post to expand details, preview media, or delete.</p>
      </div>

      {selectedPost && (
        <AdminPostDetailPanel
          post={selectedPost}
          onDelete={deletePost}
          onClose={() => setSelectedId(null)}
        />
      )}

      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => setSelectedId((cur) => (cur === post.id ? null : post.id))}
          className={`w-full text-left bg-gray-900 border rounded-xl p-3 sm:p-4 transition-colors hover:border-purple-500/50 ${
            selectedId === post.id ? "border-purple-500/50 ring-1 ring-purple-500/30" : "border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg sm:text-xl shrink-0">{post.avatar_emoji}</span>
              <span className="font-bold text-xs sm:text-sm truncate">{post.display_name}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">@{post.username}</span>
            </div>
            <span className="text-[10px] text-purple-400 shrink-0">
              {selectedId === post.id ? "Selected" : "View"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-300 line-clamp-3">{post.content}</p>
          <div className="flex gap-3 sm:gap-4 mt-2 text-[10px] sm:text-xs text-gray-500 flex-wrap">
            <span>❤️ {post.like_count}</span>
            <span>🤖 {post.ai_like_count}</span>
            {post.media_type && (
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                {post.media_type}
              </span>
            )}
            {post.media_source && (
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-mono">
                {post.media_source}
              </span>
            )}
            <span>{new Date(post.created_at).toLocaleString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function AdminPostsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl animate-pulse mb-2">📝</div>
          <p>Loading posts...</p>
        </div>
      }
    >
      <AdminPostsPageInner />
    </Suspense>
  );
}
