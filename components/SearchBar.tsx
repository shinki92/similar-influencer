"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onToggleHistory: () => void;
  isLoading: boolean;
  showHistory: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onToggleHistory,
  isLoading,
  showHistory,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      onSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-6 py-3 max-w-2xl mx-auto">
      <input
        type="text"
        placeholder="인스타그램 계정명 또는 URL을 입력하세요 (예: @username)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 outline-none text-gray-700 text-base placeholder-gray-400 min-w-0"
        disabled={isLoading}
      />
      <button
        onClick={onSearch}
        disabled={isLoading || !value.trim()}
        className="bg-[#2AABE2] hover:bg-[#1a9ad1] text-white font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isLoading ? "검색 중..." : "검색"}
      </button>
      <button
        onClick={onToggleHistory}
        className="bg-[#2AABE2] hover:bg-[#1a9ad1] text-white font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {showHistory ? "기록 닫기" : "검색 기록 보기"}
      </button>
    </div>
  );
}
