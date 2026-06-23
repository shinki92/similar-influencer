import { NextRequest, NextResponse } from "next/server";
import { saveSearchHistory } from "@/lib/storage";
import {
  parseYouTubeInput,
  searchChannelByQuery,
  fetchChannelByHandle,
  findSimilarChannels,
  fetchChannelDetail,
} from "@/lib/youtube";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { username: rawInput, bizCode } = await request.json();

    if (!rawInput || !bizCode) {
      return NextResponse.json(
        { error: "채널명과 bizCode가 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    console.log("[youtube] 검색 시작:", rawInput);

    // 1. 입력값 파싱
    const parsed = parseYouTubeInput(rawInput);
    let channelId: string | null = null;

    if (parsed.type === "id") {
      channelId = parsed.value;
    } else if (parsed.type === "handle") {
      channelId = await fetchChannelByHandle(parsed.value);
    } else {
      channelId = await searchChannelByQuery(parsed.value);
    }

    if (!channelId) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        error: "채널을 찾을 수 없습니다. 채널명을 다시 확인해주세요.",
      });
    }

    console.log("[youtube] 입력 채널 ID:", channelId);

    // 2. 입력 채널 정보 가져오기
    const inputChannelData = await fetchChannelDetail([channelId]);
    const inputChannel = inputChannelData[0];

    // 3. 유사 채널 찾기
    const similarResults = await findSimilarChannels(channelId);

    if (similarResults.length === 0) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        error: "유사한 채널을 찾지 못했습니다.",
      });
    }

    console.log("[youtube] 결과:", similarResults.length, "개");

    // 4. 기록 저장
    saveSearchHistory(bizCode, `[YouTube] ${inputChannel?.title || rawInput}`, similarResults);

    return NextResponse.json({
      results: similarResults,
      totalCount: similarResults.length,
      inputChannel,
    });
  } catch (error) {
    console.error("YouTube 검색 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
