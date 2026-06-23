"use client";

import { formatCount } from "@/lib/utils";
import type { YouTubeChannelResult } from "@/lib/youtube";

interface YouTubeResultCardProps {
  data: YouTubeChannelResult;
  onMoreClick: (channelId: string) => void;
}

export default function YouTubeResultCard({ data, onMoreClick }: YouTubeResultCardProps) {
  const { channel } = data;
  const youtubeUrl = channel.customUrl
    ? `https://youtube.com/${channel.customUrl.startsWith("@") ? channel.customUrl : "@" + channel.customUrl}`
    : `https://youtube.com/channel/${channel.channelId}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* 채널 썸네일 */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          {channel.thumbnail ? (
            <img
              src={channel.thumbnail}
              alt={channel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {channel.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </a>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-base hover:underline block truncate"
          >
            {channel.title}
          </a>

          {channel.customUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 text-sm hover:text-red-500 block mb-2"
            >
              {channel.customUrl.startsWith("@") ? channel.customUrl : `@${channel.customUrl}`}
            </a>
          )}

          {/* 채널 설명 */}
          {channel.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {channel.description}
            </p>
          )}

          {/* 통계 */}
          <div className="flex gap-6 mb-3">
            <div className="text-center">
              <div className="font-bold text-sm">{formatCount(channel.subscriberCount)}</div>
              <div className="text-xs text-gray-500">구독자</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-sm">{formatCount(channel.videoCount)}</div>
              <div className="text-xs text-gray-500">동영상</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-sm">{formatCount(channel.viewCount)}</div>
              <div className="text-xs text-gray-500">총 조회수</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              채널 보기
            </a>

            <button
              onClick={() => onMoreClick(channel.channelId)}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              유사 채널 찾기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
