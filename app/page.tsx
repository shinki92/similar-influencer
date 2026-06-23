"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import YouTubeResultCard from "@/components/YouTubeResultCard";
import SearchHistory from "@/components/SearchHistory";
import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";
import type { InfluencerResult, SearchHistoryItem } from "@/lib/types";
import type { YouTubeChannelResult } from "@/lib/youtube";

type SortOption = "recommended" | "desc" | "asc";
type Platform = "instagram" | "youtube";

function MainContent() {
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InfluencerResult[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeChannelResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 정렬 & 페이징
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 검색 기록
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 더 보기 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUsername, setModalUsername] = useState("");

  // 검색 기록 로드
  const loadHistory = useCallback(async () => {
    if (!bizCode) return;
    try {
      const res = await fetch(`/api/history?bizCode=${bizCode}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // 무시
    }
  }, [bizCode]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 플랫폼 전환 시 결과 초기화
  useEffect(() => {
    setResults([]);
    setYoutubeResults([]);
    setError("");
    setCurrentPage(1);
  }, [platform]);

  // 검색 실행
  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = searchQuery || query;
      if (!q.trim() || !bizCode) return;

      setIsLoading(true);
      setError("");
      setResults([]);
      setYoutubeResults([]);
      setCurrentPage(1);

      const apiUrl =
        platform === "instagram" ? "/api/find-similar" : "/api/find-similar-youtube";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300000);

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: q.trim(), bizCode }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "검색 중 오류가 발생했습니다.");
          return;
        }

        if (!data.results || data.results.length === 0) {
          setError(data.error || "유사한 결과를 찾지 못했습니다.");
        } else {
          if (platform === "instagram") {
            setResults(data.results);
          } else {
            setYoutubeResults(data.results);
          }
        }
        setShowHistory(false);
        loadHistory();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("검색 시간이 초과되었습니다. 다시 시도해주세요.");
        } else {
          setError("서버에 연결할 수 없습니다.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [query, bizCode, platform, loadHistory]
  );

  // 인스타 정렬
  const sortedInstaResults = [...results].sort((a, b) => {
    if (sortBy === "desc") return b.profile.followersCount - a.profile.followersCount;
    if (sortBy === "asc") return a.profile.followersCount - b.profile.followersCount;
    return 0;
  });

  // 유튜브 정렬
  const sortedYoutubeResults = [...youtubeResults].sort((a, b) => {
    if (sortBy === "desc") return b.channel.subscriberCount - a.channel.subscriberCount;
    if (sortBy === "asc") return a.channel.subscriberCount - b.channel.subscriberCount;
    return 0;
  });

  const totalResults = platform === "instagram" ? sortedInstaResults.length : sortedYoutubeResults.length;
  const totalPages = Math.ceil(totalResults / perPage);
  const pagedInstaResults = sortedInstaResults.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const pagedYoutubeResults = sortedYoutubeResults.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleMoreClick = (value: string) => {
    setModalUsername(value);
    setModalOpen(true);
  };

  const handleMoreConfirm = () => {
    setModalOpen(false);
    setQuery(modalUsername);
    handleSearch(modalUsername);
  };

  const handleExportExcel = () => {
    if (!bizCode) return;
    window.open(`/api/export?bizCode=${bizCode}`, "_blank");
  };

  const handleHistorySelect = (username: string) => {
    setQuery(username);
    handleSearch(username);
  };

  if (!bizCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">
          유효한 bizCode가 필요합니다. URL에 ?bizCode=YOUR_CODE를 추가해주세요.
        </p>
      </div>
    );
  }

  const isInsta = platform === "instagram";
  const accentColor = isInsta ? "from-blue-50 to-orange-50/30" : "from-red-50 to-pink-50/30";
  const borderColor = isInsta ? "border-orange-200/50" : "border-red-200/50";
  const titleSuffix = isInsta ? "인스타 인플루언서 찾기" : "유튜브 채널 찾기";
  const placeholder = isInsta
    ? "인스타그램 계정명 또는 URL"
    : "유튜브 채널명, @핸들 또는 URL";

  return (
    <main className="min-h-screen">
      {/* 플랫폼 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          <button
            onClick={() => setPlatform("instagram")}
            className={`flex-1 py-4 font-semibold text-sm whitespace-nowrap transition-colors ${
              isInsta
                ? "text-pink-600 border-b-2 border-pink-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📷 인스타
          </button>
          <button
            onClick={() => setPlatform("youtube")}
            className={`flex-1 py-4 font-semibold text-sm whitespace-nowrap transition-colors ${
              !isInsta
                ? "text-red-600 border-b-2 border-red-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ▶ 유사 채널
          </button>
          <a
            href={`/youtube/keyword?bizCode=${bizCode}`}
            className="flex-1 py-4 font-semibold text-sm text-gray-500 hover:text-gray-700 text-center whitespace-nowrap"
          >
            🔍 키워드 검색
          </a>
          <a
            href={`/youtube/analyze?bizCode=${bizCode}`}
            className="flex-1 py-4 font-semibold text-sm text-gray-500 hover:text-gray-700 text-center whitespace-nowrap"
          >
            📊 채널 분석
          </a>
          <a
            href={`/youtube/tracking?bizCode=${bizCode}`}
            className="flex-1 py-4 font-semibold text-sm text-gray-500 hover:text-gray-700 text-center whitespace-nowrap"
          >
            📈 성장 추적
          </a>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className={`bg-gradient-to-b ${accentColor} py-16 px-4 border-b-2 ${borderColor}`}>
        <h1 className="text-4xl md:text-5xl font-black text-center mb-4">
          {titleSuffix}
        </h1>
        <p className="text-gray-500 text-center mb-8">
          {isInsta
            ? "인스타그램 계정을 입력하면 감도가 비슷한 유사한 계정을 찾아드립니다"
            : "유튜브 채널을 입력하면 비슷한 채널을 찾아드립니다"}
        </p>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={() => handleSearch()}
          onToggleHistory={() => setShowHistory(!showHistory)}
          isLoading={isLoading}
          showHistory={showHistory}
          placeholder={placeholder}
        />

        <p className="text-center text-gray-500 mt-4 text-sm">
          {isInsta
            ? "⚠️ 인스타 검색은 월 20회로 제한됩니다 (1회 검색당 6회 소모)"
            : "✅ 유튜브 검색은 하루 약 100회 가능합니다"}
        </p>
      </div>

      {/* 검색 기록 */}
      {showHistory && (
        <div className="bg-white py-8 px-4">
          <SearchHistory items={history} onSelect={handleHistorySelect} />
        </div>
      )}

      {/* 결과 영역 */}
      <div className="bg-white py-8 px-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div
              className={`animate-spin rounded-full h-12 w-12 border-4 border-t-transparent ${
                isInsta ? "border-pink-500" : "border-red-500"
              }`}
            />
            <p className="text-gray-700 font-semibold text-lg">
              {isInsta ? "유사 인플루언서를 찾고 있습니다" : "유사 채널을 찾고 있습니다"}
            </p>
            <p className="text-gray-400 text-sm">잠시만 기다려주세요...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
        )}

        {!isLoading && totalResults > 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6 justify-end">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="recommended">추천 순</option>
                <option value="desc">{isInsta ? "팔로워 높은 순" : "구독자 많은 순"}</option>
                <option value="asc">{isInsta ? "팔로워 낮은 순" : "구독자 적은 순"}</option>
              </select>

              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={10}>10개씩 보기</option>
                <option value={30}>30개씩 보기</option>
                <option value={50}>50개씩 보기</option>
                <option value={100}>100개씩 보기</option>
              </select>

              {isInsta && (
                <button
                  onClick={handleExportExcel}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  엑셀로 다운로드
                </button>
              )}
            </div>

            <div className="space-y-4">
              {isInsta
                ? pagedInstaResults.map((result, idx) => (
                    <ResultCard
                      key={`${result.profile.username}-${idx}`}
                      data={result}
                      onMoreClick={handleMoreClick}
                    />
                  ))
                : pagedYoutubeResults.map((result, idx) => (
                    <YouTubeResultCard
                      key={`${result.channel.channelId}-${idx}`}
                      data={result}
                      onMoreClick={handleMoreClick}
                    />
                  ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        username={modalUsername}
        onConfirm={handleMoreConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
        </div>
      }
    >
      <MainContent />
    </Suspense>
  );
}
