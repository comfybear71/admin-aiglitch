"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

export default function ActivityClient() {
  const { authenticated, stats, fetchStats } = useAdmin();
  const [voiceDisabled, setVoiceDisabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (authenticated && !stats) fetchStats();
    if (authenticated) {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((d) => setVoiceDisabled(d.voice_disabled ?? false))
        .catch(() => {});
    }
  }, [authenticated]);

  const deletePost = async (id: string) => {
    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchStats();
  };

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl animate-pulse mb-2">📡</div>
        <p>Loading activity data...</p>
      </div>
    );
  }

  // Key metrics - compact layout
  const keyMetrics = [
    { label: "Posts", value: stats.overview.totalPosts, icon: "📝", color: "purple" },
    { label: "Personas", value: stats.overview.activePersonas, icon: "🤖", color: "green" },
    { label: "Users", value: stats.overview.totalUsers, icon: "👤", color: "yellow" },
    { label: "Engagement", value: stats.overview.totalHumanLikes + stats.overview.totalAILikes, icon: "📈", color: "pink" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {keyMetrics.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-gray-400 text-[10px] sm:text-xs">{stat.label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Content Breakdown - Horizontal */}
      {stats.mediaBreakdown && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
          <h3 className="text-sm font-bold mb-2 text-cyan-400">Content</h3>
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-cyan-500/10 rounded-lg p-1.5 text-center">
              <div className="text-lg mb-0.5">🎬</div>
              <p className="text-sm font-bold text-cyan-400">{stats.mediaBreakdown.videos}</p>
              <p className="text-[9px] text-gray-400">Videos</p>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-1.5 text-center">
              <div className="text-lg mb-0.5">🖼️</div>
              <p className="text-sm font-bold text-emerald-400">{stats.mediaBreakdown.images}</p>
              <p className="text-[9px] text-gray-400">Images</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-1.5 text-center">
              <div className="text-lg mb-0.5">😂</div>
              <p className="text-sm font-bold text-yellow-400">{stats.mediaBreakdown.memes}</p>
              <p className="text-[9px] text-gray-400">Memes</p>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-1.5 text-center">
              <div className="text-lg mb-0.5">🔊</div>
              <p className="text-sm font-bold text-purple-400">{stats.mediaBreakdown.audioVideos}</p>
              <p className="text-[9px] text-gray-400">Audio</p>
            </div>
            <div className="bg-gray-500/10 rounded-lg p-1.5 text-center">
              <div className="text-lg mb-0.5">📝</div>
              <p className="text-sm font-bold text-gray-400">{stats.mediaBreakdown.textOnly}</p>
              <p className="text-[9px] text-gray-400">Text</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Personas - Compact */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
        <h3 className="text-sm font-bold mb-2 text-purple-400">Top Personas</h3>
        <div className="space-y-1">
          {stats.topPersonas.slice(0, 5).map((p, i) => (
            <a key={p.username} href={`https://aiglitch.app/profile/${p.username}`}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg p-1.5 sm:p-2 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-500 text-[10px] w-4 shrink-0">#{i + 1}</span>
                <span className="text-lg shrink-0">{p.avatar_emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-[11px] sm:text-xs truncate">{p.display_name}</p>
                  <p className="text-gray-500 text-[9px] truncate">@{p.username}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-1">
                <p className="text-[10px] sm:text-xs font-bold text-purple-400">{Number(p.total_engagement).toLocaleString()}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Posts - Activity Stream */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
        <h3 className="text-sm font-bold mb-2 text-pink-400">Recent Activity</h3>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {stats.recentPosts.map((post) => (
            <div key={post.id} className="bg-gray-800/50 rounded-lg p-1.5 sm:p-2">
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  <span className="text-sm">{post.avatar_emoji}</span>
                  <span className="text-[10px] sm:text-xs font-bold">{post.display_name}</span>
                  <span className="text-[9px] text-gray-500">@{post.username}</span>
                  {post.media_type === "video" && <span className="text-[8px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">🎬</span>}
                  {post.media_type === "image" && <span className="text-[8px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">🖼️</span>}
                </div>
                <button onClick={() => deletePost(post.id)} className="text-red-400 text-[8px] hover:text-red-300 shrink-0">Delete</button>
              </div>
              <p className="text-[10px] text-gray-300 line-clamp-1">{post.content}</p>
              <p className="text-[8px] text-gray-500 mt-0.5">❤️ {post.like_count} · {new Date(post.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
