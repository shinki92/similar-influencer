"use client";

import Image from "next/image";
import { formatCount } from "@/lib/utils";
import type { InfluencerResult } from "@/lib/types";

interface ResultCardProps {
  data: InfluencerResult;
  onMoreClick: (username: string) => void;
}

export default function ResultCard({ data, onMoreClick }: ResultCardProps) {
  const { profile, recentPosts } = data;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-6">
        {/* 왼쪽: 프로필 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {/* 프로필 사진 */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {profile.profilePic ? (
                <Image
                  src={profile.profilePic}
                  alt={profile.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xl">
                  ?
                </div>
              )}
            </div>

            {/* 이름, 아이디 */}
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-lg">{profile.name}</span>
                {profile.isVerified && (
                  <svg
                    className="w-5 h-5 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
              <span className="text-gray-500 text-sm">
                @{profile.username}
              </span>
            </div>
          </div>

          {/* 바이오 */}
          {profile.bio && (
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-line line-clamp-3">
              {profile.bio}
            </p>
          )}

          {/* 외부 링크 */}
          {profile.externalUrl && (
            <a
              href={profile.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {profile.externalUrl.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* 더 보기 버튼 */}
          <button
            onClick={() => onMoreClick(profile.username)}
            className="border border-[#2AABE2] text-[#2AABE2] hover:bg-[#2AABE2] hover:text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors mb-3"
          >
            더 보기
          </button>

          {/* 통계 */}
          <div className="flex gap-6 border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-center">
              <div className="font-bold text-base">
                {formatCount(profile.postsCount)}
              </div>
              <div className="text-xs text-gray-500">게시물</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base">
                {formatCount(profile.followersCount)}
              </div>
              <div className="text-xs text-gray-500">팔로워</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base">
                {formatCount(profile.followingCount)}
              </div>
              <div className="text-xs text-gray-500">팔로잉</div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 최근 게시물 썸네일 */}
        <div className="flex gap-1.5 flex-shrink-0">
          {recentPosts.slice(0, 5).map((post, idx) => (
            <div
              key={idx}
              className="w-[90px] h-[120px] rounded-lg overflow-hidden bg-gray-100 relative"
            >
              {post.thumbnailUrl ? (
                <Image
                  src={post.thumbnailUrl}
                  alt={`게시물 ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
              {post.isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/40 rounded-full p-2">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
              {post.viewCount && (
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatCount(post.viewCount)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
