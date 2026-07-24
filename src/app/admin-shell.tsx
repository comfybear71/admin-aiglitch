"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";
import { TABS, type Tab } from "./admin-types";
import { ECOSYSTEM_URLS } from "@/lib/ecosystem-urls";

const SHELL_SUPPRESSED_PATHS = new Set(["/login"]);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (SHELL_SUPPRESSED_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return <AdminShellInner pathname={pathname}>{children}</AdminShellInner>;
}

function AdminShellInner({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const {
    setAuthenticated,
    generationLog,
    setGenerationLog,
    generating,
    genProgress,
    elapsed,
    autopilotTotal,
    autopilotCurrent,
    autopilotQueue,
  } = useAdmin();

  const [authChecking, setAuthChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (res.ok) setAuthenticated(true);
        setAuthChecking(false);
      })
      .catch(() => setAuthChecking(false));
  }, [setAuthenticated]);

  const pathSegment = pathname.split("/")[1] || "";
  const activeTab: Tab =
    (TABS.find((t) => t.id === pathSegment)?.id) || "overview";

  const navigateToTab = (tabId: Tab) => {
    setMobileOpen(false);
    if (tabId === "overview") {
      router.push("/");
    } else {
      router.push(`/${tabId}`);
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/admin", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* network error — fall through to redirect anyway */
    }
    window.location.href = "/login";
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">
          Checking session...
        </div>
      </div>
    );
  }

  const navButtons = (
    <nav className="flex flex-col gap-1">
      {TABS.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => navigateToTab(t.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all ${
              active
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "text-gray-400 border border-transparent hover:bg-gray-800/70 hover:text-gray-200"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between bg-gray-900/80 border-b border-gray-800 backdrop-blur-xl px-3 py-2">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="px-2.5 py-1.5 bg-gray-800 text-gray-200 rounded-lg text-sm font-bold"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
        <Brand />
        <button
          type="button"
          onClick={signOut}
          className="px-2.5 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20"
        >
          {"\u{1F6AA}"}
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 border-r border-gray-800 bg-gray-900/40 p-4 overflow-y-auto">
          <div className="px-1 pb-5">
            <Brand />
          </div>
          {navButtons}
          <div className="mt-auto pt-5 flex flex-col gap-2">
            <a
              href={ECOSYSTEM_URLS.feed}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
            >
              {"\u{1F3E0}"} Feed
            </a>
            <a
              href={ECOSYSTEM_URLS.marketing}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
            >
              {"\u{1F4E3}"} Marketing
            </a>
            <a
              href={ECOSYSTEM_URLS.trading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
            >
              {"\u{1F4C8}"} Trading
            </a>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20"
            >
              {"\u{1F6AA}"} Sign out
            </button>
          </div>
        </aside>

        {/* Mobile slide-down drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-x-0 top-[49px] z-40 bg-gray-950/95 border-b border-gray-800 backdrop-blur-xl p-4 animate-slide-up max-h-[calc(100vh-49px)] overflow-y-auto">
            {navButtons}
            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-2">
              <a
                href={ECOSYSTEM_URLS.feed}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
              >
                {"\u{1F3E0}"} Feed
              </a>
              <a
                href={ECOSYSTEM_URLS.marketing}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
              >
                {"\u{1F4E3}"} Marketing
              </a>
              <a
                href={ECOSYSTEM_URLS.trading}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-700"
              >
                {"\u{1F4C8}"} Trading
              </a>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto w-full">
          {/* Generation Progress Panel */}
          {generationLog.length > 0 && (
            <div className="mb-4">
              <div
                className={`border rounded-xl p-4 ${
                  generating || genProgress || autopilotQueue.length > 0
                    ? "bg-green-950/30 border-green-800/50"
                    : "bg-gray-900 border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(generating ||
                      genProgress ||
                      autopilotQueue.length > 0) && (
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                    <h3 className="text-sm font-bold text-green-400">
                      {generating || genProgress
                        ? autopilotTotal > 0
                          ? `🤖 AUTOPILOT ${autopilotCurrent}/${autopilotTotal} — Generation in progress...`
                          : "Generation in progress..."
                        : autopilotQueue.length > 0
                        ? `🤖 AUTOPILOT ${autopilotCurrent}/${autopilotTotal} — Next video in ~2 min...`
                        : autopilotTotal > 0 && autopilotCurrent >= autopilotTotal
                        ? `✅ AUTOPILOT COMPLETE: ${autopilotTotal} videos`
                        : "Generation complete"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGenerationLog([])}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Clear
                    </button>
                    {!generating && !genProgress && (
                      <button
                        onClick={() => setGenerationLog([])}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>

                {genProgress && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-green-300 font-bold">
                        {genProgress.label} {genProgress.current}/{genProgress.total}
                      </span>
                      <span className="text-yellow-400 font-mono tabular-nums">
                        {Math.floor(elapsed / 60)}:
                        {String(elapsed % 60).padStart(2, "0")} elapsed
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                        style={{
                          width: `${
                            ((genProgress.current - 1) / genProgress.total) * 100
                          }%`,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 bg-green-400/60 animate-pulse transition-all duration-500"
                        style={{
                          left: `${
                            ((genProgress.current - 1) / genProgress.total) * 100
                          }%`,
                          width: `${(1 / genProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>{genProgress.current - 1} done</span>
                      <span>
                        ~
                        {Math.max(
                          1,
                          Math.ceil(
                            (genProgress.total - genProgress.current + 1) *
                              Math.max(elapsed, 60)
                          )
                        )}
                        s remaining (est.)
                      </span>
                    </div>
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                  {generationLog.map((msg, i) => (
                    <div
                      key={i}
                      className={`${
                        i === generationLog.length - 1 &&
                        (generating || genProgress)
                          ? "text-green-300"
                          : "text-gray-400"
                      }`}
                    >
                      <span className="text-gray-600 mr-2">[{i + 1}]</span>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{"⚙️"}</span>
      <h1 className="text-base font-black whitespace-nowrap">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          AIG!itch
        </span>
        <span className="text-gray-400 ml-1.5 text-xs font-normal">Admin</span>
      </h1>
    </div>
  );
}
