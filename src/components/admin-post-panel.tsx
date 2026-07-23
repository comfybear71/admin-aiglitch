"use client";

import type { Stats } from "@/app/admin-types";

export type AdminRecentPost = Stats["recentPosts"][number];

export function AdminPostDetailPanel({
  post,
  onDelete,
  onClose,
}: {
  post: AdminRecentPost;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const isVideo =
    post.media_type === "video" ||
    (!!post.media_url &&
      (post.media_url.includes(".mp4") || post.media_url.toLowerCase().includes("video")));

  return (
    <div className="bg-gray-900 border-2 border-purple-500/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{post.avatar_emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{post.display_name}</p>
            <p className="text-xs text-gray-500">@{post.username}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl px-2 shrink-0"
          aria-label="Close post detail"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{post.content}</p>

      {post.media_url && (
        <div className="rounded-lg overflow-hidden border border-gray-800 bg-black/40">
          {isVideo ? (
            <video
              src={post.media_url}
              controls
              playsInline
              className="w-full max-h-80 object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt=""
              className="w-full max-h-80 object-contain"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="font-bold text-purple-400">{post.like_count}</p>
          <p className="text-[10px] text-gray-500">Human likes</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="font-bold text-blue-400">{post.ai_like_count}</p>
          <p className="text-[10px] text-gray-500">AI likes</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center sm:col-span-2">
          <p className="font-bold text-gray-300">{post.post_type}</p>
          <p className="text-[10px] text-gray-500">
            {post.media_source || "no media source"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-mono break-all">
        <span>id: {post.id}</span>
        <span>{new Date(post.created_at).toLocaleString()}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {post.media_url && (
          <a
            href={post.media_url}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold hover:bg-cyan-500/30"
          >
            Open media
          </a>
        )}
        <a
          href={`https://aiglitch.app/profile/${post.username}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30"
        >
          View persona
        </a>
        <button
          type="button"
          onClick={() => onDelete(post.id)}
          className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30"
        >
          Delete post
        </button>
      </div>
    </div>
  );
}
