import { NextRequest, NextResponse } from "next/server";
import {
  addChannelToTracking,
  getTrackedChannels,
  removeTrackedChannel,
} from "@/lib/storage";
import { fetchChannelDetail } from "@/lib/youtube";

// 추적 채널 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bizCode = searchParams.get("bizCode");
  const refresh = searchParams.get("refresh") === "1";

  if (!bizCode) {
    return NextResponse.json({ error: "bizCode 필요" }, { status: 400 });
  }

  const channels = getTrackedChannels(bizCode);

  // refresh=1 이면 모든 채널의 현재 데이터를 가져와서 스냅샷 추가
  if (refresh && channels.length > 0) {
    const ids = channels.map((c) => c.channelId);
    const fresh = await fetchChannelDetail(ids);
    for (const f of fresh) {
      addChannelToTracking(bizCode, {
        channelId: f.channelId,
        title: f.title,
        thumbnail: f.thumbnail,
        customUrl: f.customUrl,
        subscriberCount: f.subscriberCount,
        videoCount: f.videoCount,
        viewCount: f.viewCount,
      });
    }
    return NextResponse.json({ channels: getTrackedChannels(bizCode) });
  }

  return NextResponse.json({ channels });
}

// 채널 추적 추가
export async function POST(request: NextRequest) {
  try {
    const { bizCode, channelId } = await request.json();

    if (!bizCode || !channelId) {
      return NextResponse.json(
        { error: "bizCode와 channelId 필요" },
        { status: 400 }
      );
    }

    const channels = await fetchChannelDetail([channelId]);
    if (channels.length === 0) {
      return NextResponse.json({ error: "채널을 찾을 수 없음" }, { status: 404 });
    }

    addChannelToTracking(bizCode, {
      channelId: channels[0].channelId,
      title: channels[0].title,
      thumbnail: channels[0].thumbnail,
      customUrl: channels[0].customUrl,
      subscriberCount: channels[0].subscriberCount,
      videoCount: channels[0].videoCount,
      viewCount: channels[0].viewCount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("추적 추가 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// 추적 제거
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bizCode = searchParams.get("bizCode");
  const channelId = searchParams.get("channelId");

  if (!bizCode || !channelId) {
    return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
  }

  removeTrackedChannel(bizCode, channelId);
  return NextResponse.json({ success: true });
}
