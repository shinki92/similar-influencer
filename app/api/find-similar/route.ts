import { NextRequest, NextResponse } from "next/server";
import { saveSearchHistory } from "@/lib/storage";
import { normalizeUsername } from "@/lib/instagram";
import { findSimilarAccounts } from "@/lib/analyze";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { username: rawUsername, bizCode } = await request.json();

    if (!rawUsername || !bizCode) {
      return NextResponse.json(
        { error: "계정명과 bizCode가 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      return NextResponse.json(
        { error: "Groq API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const username = normalizeUsername(rawUsername);
    console.log("[find-similar] 검색 시작:", username);

    // AI로 유사 계정 분석 및 추천 (크롤링 없이)
    const { results, category, keywords } = await findSimilarAccounts(username);
    console.log("[find-similar] 결과:", results.length, "개, 카테고리:", category, "키워드:", keywords);

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        remainingSearches: -1,
      });
    }

    // 기록 저장
    saveSearchHistory(bizCode, username, results);

    return NextResponse.json({
      results,
      totalCount: results.length,
      remainingSearches: -1,
    });
  } catch (error) {
    console.error("검색 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
