"use client";

import type { InfluencerResult } from "@/lib/types";

interface ResultCardProps {
  data: InfluencerResult;
  onMoreClick: (username: string) => void;
}

export default function ResultCard({ data, onMoreClick }: ResultCardProps) {
  const { profile } = data;
  const instagramUrl = `https://instagram.com/${profile.username}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* 프로필 아이콘 */}
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <span className="text-white text-lg font-bold">
            {(profile.name || profile.username).charAt(0).toUpperCase()}
          </span>
        </a>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-base hover:underline truncate"
            >
              {profile.name}
            </a>
            {profile.isVerified && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 text-sm hover:text-blue-500 block mb-2"
          >
            @{profile.username}
          </a>

          {/* 추천 이유 */}
          {profile.bio && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-2">
            {/* 인스타그램 프로필 보기 */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              프로필 보기
            </a>

            {/* 더 보기 (유사 계정 재검색) */}
            <button
              onClick={() => onMoreClick(profile.username)}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              유사 계정 찾기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
