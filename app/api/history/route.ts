import { NextRequest, NextResponse } from "next/server";
import { getSearchHistory } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bizCode = searchParams.get("bizCode");

    if (!bizCode) {
      return NextResponse.json(
        { error: "bizCode가 필요합니다." },
        { status: 400 }
      );
    }

    const history = getSearchHistory(bizCode);

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        username: h.username,
        searched_at: h.searched_at,
      })),
      remainingSearches: -1,
    });
  } catch (error) {
    console.error("검색 기록 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
