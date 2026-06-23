import { NextRequest, NextResponse } from "next/server";
import {
  parseYouTubeInput,
  searchChannelByQuery,
  fetchChannelByHandle,
  fetchChannelDetail,
  fetchChannelVideos,
  analyzeChannel,
} from "@/lib/youtube";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { username: rawInput } = await request.json();

    if (!rawInput) {
      return NextResponse.json({ error: "채널명이 필요합니다." }, { status: 400 });
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const parsed = parseYouTubeInput(rawInput);
    let channelId: string | null = null;

    if (parsed.type === "id") channelId = parsed.value;
    else if (parsed.type === "handle") channelId = await fetchChannelByHandle(parsed.value);
    else channelId = await searchChannelByQuery(parsed.value);

    if (!channelId) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 채널 + 영상 동시 가져오기
    const [channels, videos] = await Promise.all([
      fetchChannelDetail([channelId]),
      fetchChannelVideos(channelId, 50),
    ]);

    if (channels.length === 0) {
      return NextResponse.json({ error: "채널 정보를 가져올 수 없습니다." }, { status: 404 });
    }

    const analytics = analyzeChannel(videos);

    return NextResponse.json({
      channel: channels[0],
      analytics,
    });
  } catch (error) {
    console.error("YouTube 분석 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
