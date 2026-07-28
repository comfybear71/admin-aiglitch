"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL → Social Blaster (TikTok tab). */
export default function TikTokBlasterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/social-blaster?tab=tiktok");
  }, [router]);
  return (
    <div className="text-gray-500 text-sm p-8">Redirecting to Social Blaster…</div>
  );
}
