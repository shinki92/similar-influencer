"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import YouTubeNav from "@/components/YouTubeNav";
import { formatCount } from "@/lib/utils";

interface Snapshot {
  date: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

interface TrackedChannel {
  channelId: string;
  title: string;
  thumbnail: string;
  customUrl: string | null;
  snapshots: Snapshot[];
  addedAt: string;
}

function MainContent() {
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";

  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (refresh: boolean = false) => {
    if (!bizCode) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await fetch(
        `/api/youtube-tracking?bizCode=${bizCode}${refresh ? "&refresh=1" : ""}`
      );
      const data = await res.json();
      setChannels(data.channels || []);
    } catch {
      // 무시
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [bizCode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (channelId: string) => {
    if (!confirm("이 채널을 추적 목록에서 제거하시겠습니까?")) return;
    await fetch(`/api/youtube-tracking?bizCode=${bizCode}&channelId=${channelId}`, {
      method: "DELETE",
    });
    load();
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
          📈 채널 성장 추적
        </h1>
        <p className="text-gray-500 text-center mb-6">
          관심 채널의 구독자/조회수 변화를 추적합니다
        </p>
        <div className="text-center">
          <button
            onClick={() => load(true)}
            disabled={isRefreshing || channels.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {isRefreshing ? "갱신 중..." : "🔄 현재 데이터 갱신"}
          </button>
        </div>
      </div>

      <div className="py-8 px-4 max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent mx-auto" />
          </div>
        )}

        {!isLoading && channels.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-gray-600">아직 추적 중인 채널이 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">
              채널 분석 페이지에서 &apos;성장 추적&apos; 버튼을 눌러 추가하세요.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {channels.map((c) => {
            const latest = c.snapshots[c.snapshots.length - 1];
            const first = c.snapshots[0];
            const subDiff = latest.subscriberCount - first.subscriberCount;
            const viewDiff = latest.viewCount - first.viewCount;
            const youtubeUrl = c.customUrl
              ? `https://youtube.com/${c.customUrl.startsWith("@") ? c.customUrl : "@" + c.customUrl}`
              : `https://youtube.com/channel/${c.channelId}`;

            return (
              <div key={c.channelId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <img src={c.thumbnail} alt={c.title} className="w-16 h-16 rounded-full" />
                  </a>
                  <div className="flex-1">
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-lg hover:underline"
                    >
                      {c.title}
                    </a>
                    {c.customUrl && <p className="text-sm text-gray-500">{c.customUrl}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      추적 시작: {new Date(c.addedAt).toLocaleDateString("ko-KR")} · 스냅샷 {c.snapshots.length}개
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(c.channelId)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    제거
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">구독자</div>
                    <div className="text-lg font-bold">{formatCount(latest.subscriberCount)}</div>
                    {subDiff !== 0 && (
                      <div className={`text-xs mt-1 ${subDiff > 0 ? "text-green-600" : "text-red-600"}`}>
                        {subDiff > 0 ? "▲" : "▼"} {formatCount(Math.abs(subDiff))}
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">총 조회수</div>
                    <div className="text-lg font-bold">{formatCount(latest.viewCount)}</div>
                    {viewDiff !== 0 && (
                      <div className={`text-xs mt-1 ${viewDiff > 0 ? "text-green-600" : "text-red-600"}`}>
                        {viewDiff > 0 ? "▲" : "▼"} {formatCount(Math.abs(viewDiff))}
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">동영상</div>
                    <div className="text-lg font-bold">{formatCount(latest.videoCount)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
