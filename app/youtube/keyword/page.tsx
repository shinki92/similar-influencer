"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import YouTubeNav from "@/components/YouTubeNav";
import YouTubeResultCard from "@/components/YouTubeResultCard";
import type { YouTubeChannelResult } from "@/lib/youtube";

function MainContent() {
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";

  const [keyword, setKeyword] = useState("");
  const [minSub, setMinSub] = useState(0);
  const [maxSub, setMaxSub] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<YouTubeChannelResult[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/youtube-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          minSubscribers: minSub,
          maxSubscribers: maxSub,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "검색 실패");
        return;
      }
      if (data.results.length === 0) {
        setError("결과가 없습니다.");
      } else {
        setResults(data.results);
      }
    } catch {
      setError("서버 오류");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoreClick = (channelId: string) => {
    window.open(`/youtube/analyze?bizCode=${bizCode}&channelId=${channelId}`, "_blank");
  };

  if (!bizCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">URL에 ?bizCode=YOUR_CODE를 추가해주세요.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <YouTubeNav />

      <div className="bg-gradient-to-b from-red-50 to-pink-50/30 py-12 px-4 border-b-2 border-red-200/50">
        <h1 className="text-3xl md:text-4xl font-black text-center mb-4">
          🔍 유튜브 키워드 검색
        </h1>
        <p className="text-gray-500 text-center mb-6">
          키워드로 채널 찾기 + 구독자 범위 필터
        </p>

        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-6 py-3">
            <input
              type="text"
              placeholder="키워드 입력 (예: ASMR, 먹방, 브이로그)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 outline-none text-gray-700"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !keyword.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? "검색 중..." : "검색"}
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm">
            <span className="text-sm text-gray-600">구독자:</span>
            <input
              type="number"
              placeholder="최소"
              value={minSub || ""}
              onChange={(e) => setMinSub(Number(e.target.value))}
              className="flex-1 outline-none border-b border-gray-200 px-2 py-1 text-sm"
            />
            <span>~</span>
            <input
              type="number"
              placeholder="최대 (0=무제한)"
              value={maxSub || ""}
              onChange={(e) => setMaxSub(Number(e.target.value))}
              className="flex-1 outline-none border-b border-gray-200 px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="py-8 px-4 max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto" />
          </div>
        )}

        {error && <p className="text-center text-red-500 py-16">{error}</p>}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((r, i) => (
              <YouTubeResultCard
                key={`${r.channel.channelId}-${i}`}
                data={r}
                onMoreClick={handleMoreClick}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <MainContent />
    </Suspense>
  );
}
