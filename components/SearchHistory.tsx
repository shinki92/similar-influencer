"use client";

import { formatDate } from "@/lib/utils";
import type { SearchHistoryItem } from "@/lib/types";

interface SearchHistoryProps {
  items: SearchHistoryItem[];
  onSelect: (username: string) => void;
}

export default function SearchHistory({ items, onSelect }: SearchHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <h3 className="text-xl font-bold mb-4">최근 검색 기록</h3>
        <p className="text-gray-500">검색 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h3 className="text-xl font-bold mb-4">최근 검색 기록</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.username)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-800">{item.username}</span>
            <span className="text-sm text-gray-400">
              {formatDate(item.searched_at)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
