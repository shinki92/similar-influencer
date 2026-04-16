"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import SearchHistory from "@/components/SearchHistory";
import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";
import type { InfluencerResult, SearchHistoryItem } from "@/lib/types";

type SortOption = "recommended" | "desc" | "asc";

function MainContent() {
  const searchParams = useSearchParams();
  const bizCode = searchParams.get("bizCode") || "";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InfluencerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingSearches, setRemainingSearches] = useState(10);

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

  // 검색 기록 & 남은 횟수 로드
  const loadHistory = useCallback(async () => {
    if (!bizCode) return;
    try {
      const res = await fetch(`/api/history?bizCode=${bizCode}`);
      const data = await res.json();
      setHistory(data.history || []);
      setRemainingSearches(data.remainingSearches ?? 10);
    } catch {
      // 무시
    }
  }, [bizCode]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 검색 실행
  const handleSearch = useCallback(async (searchUsername?: string) => {
    const username = searchUsername || query;
    if (!username.trim() || !bizCode) return;

    setIsLoading(true);
    setError("");
    setResults([]);
    setCurrentPage(1);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5분 타임아웃

      const res = await fetch("/api/find-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), bizCode }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "검색 중 오류가 발생했습니다.");
        return;
      }

      if (data.results.length === 0) {
        setError("유사한 계정을 찾지 못했습니다. 다른 계정명을 시도해보세요.");
      } else {
        setResults(data.results);
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
  }, [query, bizCode, loadHistory]);

  // 정렬된 결과
  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "desc")
      return b.profile.followersCount - a.profile.followersCount;
    if (sortBy === "asc")
      return a.profile.followersCount - b.profile.followersCount;
    return 0;
  });

  // 페이징
  const totalPages = Math.ceil(sortedResults.length / perPage);
  const pagedResults = sortedResults.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // "더 보기" 클릭
  const handleMoreClick = (username: string) => {
    setModalUsername(username);
    setModalOpen(true);
  };

  const handleMoreConfirm = () => {
    setModalOpen(false);
    setQuery(modalUsername);
    handleSearch(modalUsername);
  };

  // 엑셀 다운로드
  const handleExportExcel = () => {
    if (!bizCode) return;
    window.open(`/api/export?bizCode=${bizCode}`, "_blank");
  };

  // 검색 기록에서 선택
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

  return (
    <main className="min-h-screen">
      {/* 검색 영역 */}
      <div className="bg-gradient-to-b from-blue-50 to-orange-50/30 py-16 px-4 border-b-2 border-orange-200/50">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-4">
          인스타 인플루언서 찾기
        </h1>
        <p className="text-gray-500 text-center mb-8">
          인스타그램 계정을 입력하면 감도가 비슷한 유사한
          <br />
          계정을 찾아드립니다
        </p>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={() => handleSearch()}
          onToggleHistory={() => setShowHistory(!showHistory)}
          isLoading={isLoading}
          showHistory={showHistory}
        />

        <p className="text-center text-gray-500 mt-4">
          검색 횟수: 무제한
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
        {/* 로딩 */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2AABE2] border-t-transparent" />
            <p className="text-gray-700 font-semibold text-lg">유사 인플루언서를 찾고 있습니다</p>
            <p className="text-gray-400 text-sm">AI 분석 및 계정 정보 수집 중... (최대 1~2분 소요)</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
        )}

        {/* 결과 없음 */}
        {!isLoading &&
          !error &&
          results.length === 0 &&
          query &&
          !showHistory && (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🤷</p>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                검색 결과가 없습니다.
              </h3>
              <p className="text-gray-500">
                다른 인스타그램 계정명을 시도해보거나,
                <br />
                오타가 없는지 확인해주세요.
              </p>
            </div>
          )}

        {/* 결과 리스트 */}
        {!isLoading && results.length > 0 && (
          <div className="max-w-5xl mx-auto">
            {/* 정렬 & 페이지당 개수 & 엑셀 */}
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
                <option value="desc">팔로워 높은 순</option>
                <option value="asc">팔로워 낮은 순</option>
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

              <button
                onClick={handleExportExcel}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                엑셀로 다운로드
              </button>
            </div>

            {/* 카드 리스트 */}
            <div className="space-y-4">
              {pagedResults.map((result, idx) => (
                <ResultCard
                  key={`${result.profile.username}-${idx}`}
                  data={result}
                  onMoreClick={handleMoreClick}
                />
              ))}
            </div>

            {/* 페이지네이션 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* 더 보기 확인 모달 */}
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
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2AABE2] border-t-transparent" />
        </div>
      }
    >
      <MainContent />
    </Suspense>
  );
}
