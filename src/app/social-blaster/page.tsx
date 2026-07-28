"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FacebookPanel } from "./facebook-panel";
import { TikTokPanel } from "./tiktok-panel";

type Tab = "facebook" | "tiktok";

function SocialBlasterInner() {
  const params = useSearchParams();
  const initial = params.get("tab") === "tiktok" ? "tiktok" : "facebook";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border border-purple-500/30 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📡</span>
            <div>
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Social Blaster
              </h1>
              <p className="text-gray-400 text-xs max-w-xl">
                Manual posting when APIs shadow-ban or reject us. TikTok = videos only. Facebook = images, videos, and text.
              </p>
            </div>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm font-bold">
            <button
              type="button"
              onClick={() => setTab("facebook")}
              className={`px-4 py-2 ${tab === "facebook" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400"}`}
            >
              Facebook
            </button>
            <button
              type="button"
              onClick={() => setTab("tiktok")}
              className={`px-4 py-2 ${tab === "tiktok" ? "bg-cyan-600 text-white" : "bg-gray-900 text-gray-400"}`}
            >
              TikTok
            </button>
          </div>
        </div>
      </div>

      {tab === "facebook" ? <FacebookPanel /> : <TikTokPanel />}
    </div>
  );
}

export default function SocialBlasterPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading…</div>}>
      <SocialBlasterInner />
    </Suspense>
  );
}
