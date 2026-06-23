import { NextRequest, NextResponse } from "next/server";
import { searchChannelsByKeyword } from "@/lib/youtube";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { keyword, minSubscribers = 0, maxSubscribers = 0 } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: "키워드가 필요합니다." }, { status: 400 });
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YouTube API 키 없음" }, { status: 500 });
    }

    let results = await searchChannelsByKeyword(keyword, 30);

    // 구독자 범위 필터
    if (minSubscribers > 0) {
      results = results.filter((r) => r.channel.subscriberCount >= minSubscribers);
    }
    if (maxSubscribers > 0) {
      results = results.filter((r) => r.channel.subscriberCount <= maxSubscribers);
    }

    return NextResponse.json({ results, totalCount: results.length });
  } catch (error) {
    console.error("YouTube 키워드 검색 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
