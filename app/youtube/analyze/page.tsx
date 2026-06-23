"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import YouTubeNav from "@/components/YouTubeNav";
import { formatCount } from "@/lib/utils";
import type { YouTubeChannel, YouTubeVideo } from "@/lib/youtube";

interface Analytics {
  averageViews: number;
  averageLikes: number;
  averageComments: number;
  uploadFrequencyDays: number;
  engagementRate: number;
  topVideos: YouTubeVideo[];
  recentVideos: YouTubeVideo[];
}

function MainContent() {
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError("");
    setChannel(null);
    setAnalytics(null);

    try {
      const res = await fetch("/api/youtube-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "분석 실패");
        return;
      }
      setChannel(data.channel);
      setAnalytics(data.analytics);
    } catch {
      setError("서버 오류");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!channel || !bizCode) return;
    try {
      const res = await fetch("/api/youtube-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizCode, channelId: channel.channelId }),
      });
      if (res.ok) alert("성장 추적 목록에 추가되었습니다!");
    } catch {
      alert("추가 실패");
    }
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
        <h1 className="text-3xl md:text-4xl font-black text-center mb-6">
          📊 유튜브 채널 분석
        </h1>
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white rounded-full shadow-lg px-6 py-3">
          <input
            type="text"
            placeholder="채널명, @핸들 또는 URL 입력"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="flex-1 outline-none text-gray-700"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !input.trim()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isLoading ? "분석 중..." : "분석"}
          </button>
        </div>
      </div>

      <div className="py-8 px-4 max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto" />
            <p className="mt-4 text-gray-600">채널 분석 중...</p>
          </div>
        )}

        {error && <p className="text-center text-red-500 py-16">{error}</p>}

        {channel && analytics && (
          <div className="space-y-6">
            {/* 채널 정보 카드 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                {channel.thumbnail && (
                  <img
                    src={channel.thumbnail}
                    alt={channel.title}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{channel.title}</h2>
                  {channel.customUrl && (
                    <p className="text-gray-500 text-sm">{channel.customUrl}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{channel.description}</p>
                </div>
                <button
                  onClick={handleTrack}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  📈 성장 추적
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{formatCount(channel.subscriberCount)}</div>
                  <div className="text-xs text-gray-500 mt-1">구독자</div>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{formatCount(channel.videoCount)}</div>
                  <div className="text-xs text-gray-500 mt-1">동영상</div>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{formatCount(channel.viewCount)}</div>
                  <div className="text-xs text-gray-500 mt-1">총 조회수</div>
                </div>
              </div>
            </div>

            {/* 분석 지표 카드 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-lg mb-4">📈 채널 분석 지표 (최근 50개 영상 기준)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xs text-blue-700 mb-1">평균 조회수</div>
                  <div className="text-xl font-bold text-blue-900">{formatCount(analytics.averageViews)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-xs text-green-700 mb-1">평균 좋아요</div>
                  <div className="text-xl font-bold text-green-900">{formatCount(analytics.averageLikes)}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-xs text-purple-700 mb-1">참여율</div>
                  <div className="text-xl font-bold text-purple-900">{analytics.engagementRate.toFixed(2)}%</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-xs text-orange-700 mb-1">업로드 주기</div>
                  <div className="text-xl font-bold text-orange-900">
                    {analytics.uploadFrequencyDays.toFixed(1)}일
                  </div>
                </div>
              </div>
            </div>

            {/* 인기 영상 TOP 5 */}
            {analytics.topVideos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-lg mb-4">🔥 인기 영상 TOP 5</h3>
                <div className="space-y-3">
                  {analytics.topVideos.map((v, i) => (
                    <a
                      key={v.videoId}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                    >
                      <span className="text-lg font-bold text-red-600 w-6 flex-shrink-0">{i + 1}</span>
                      <img src={v.thumbnail} alt={v.title} className="w-32 h-20 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2">{v.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          조회수 {formatCount(v.viewCount)} · 좋아요 {formatCount(v.likeCount)} · {v.duration}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 영상 */}
            {analytics.recentVideos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-lg mb-4">🆕 최근 영상</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {analytics.recentVideos.slice(0, 9).map((v) => (
                    <a
                      key={v.videoId}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80"
                    >
                      <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover rounded mb-2" />
                      <p className="text-sm font-semibold line-clamp-2">{v.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatCount(v.viewCount)} 조회수</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
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
