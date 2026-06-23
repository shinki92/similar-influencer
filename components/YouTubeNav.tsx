"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/", label: "📷 인스타", platform: "instagram" },
  { href: "/", label: "▶ 유사 채널", platform: "youtube" },
  { href: "/youtube/keyword", label: "🔍 키워드 검색" },
  { href: "/youtube/analyze", label: "📊 채널 분석" },
  { href: "/youtube/tracking", label: "📈 성장 추적" },
];

export default function YouTubeNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";
  const qs = bizCode ? `?bizCode=${bizCode}` : "";

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto flex overflow-x-auto">
        {TABS.map((tab) => {
          const isActive =
            tab.href === pathname ||
            (tab.href === "/youtube/analyze" && pathname.startsWith("/youtube/analyze")) ||
            (tab.href === "/youtube/keyword" && pathname.startsWith("/youtube/keyword")) ||
            (tab.href === "/youtube/tracking" && pathname.startsWith("/youtube/tracking"));

          return (
            <Link
              key={tab.label}
              href={`${tab.href}${qs}`}
              className={`px-4 py-4 font-semibold text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
