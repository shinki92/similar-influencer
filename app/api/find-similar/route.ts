import { NextRequest, NextResponse } from "next/server";
import { saveSearchHistory } from "@/lib/storage";
import { normalizeUsername, fetchSimilarAccounts, fetchProfileAbout } from "@/lib/instagram";
import type { InfluencerResult } from "@/lib/types";

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

    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json(
        { error: "RapidAPI 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const username = normalizeUsername(rawUsername);
    console.log("[find-similar] 검색 시작:", username);

    // 1. RapidAPI로 유사 계정 가져오기 (1회 API 호출)
    const similarResults = await fetchSimilarAccounts(username);

    if (similarResults.length === 0) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        error: "유사한 계정을 찾지 못했습니다. 다른 계정명을 시도해보세요.",
      });
    }

    // 2. 상위 몇 개의 프로필 상세 정보 가져오기 (무료 플랜 고려)
    const results: InfluencerResult[] = [];
    const maxDetail = 5; // 무료 플랜이므로 상세 조회는 5개만

    for (let i = 0; i < similarResults.length; i++) {
      if (i < maxDetail) {
        // 상세 정보 조회
        const detail = await fetchProfileAbout(similarResults[i].profile.username);
        if (detail) {
          results.push({
            profile: detail,
            recentPosts: [],
          });
        } else {
          // 상세 조회 실패시 기본 정보만
          results.push(similarResults[i]);
        }
        await new Promise((r) => setTimeout(r, 300));
      } else {
        // 나머지는 기본 정보만
        results.push(similarResults[i]);
      }
    }

    console.log("[find-similar] 최종 결과:", results.length, "개");

    // 3. 기록 저장
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
