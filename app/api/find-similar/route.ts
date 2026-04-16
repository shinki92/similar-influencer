import { NextRequest, NextResponse } from "next/server";
import { saveSearchHistory } from "@/lib/storage";
import { normalizeUsername, fetchSimilarAccounts, fetchProfileAbout } from "@/lib/instagram";
import { generateRecommendReasons } from "@/lib/analyze";
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

    // 1. RapidAPI로 유사 계정 가져오기
    const similarResults = await fetchSimilarAccounts(username);

    if (similarResults.length === 0) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        error: "유사한 계정을 찾지 못했습니다. 다른 계정명을 시도해보세요.",
      });
    }

    // 2. 상위 5개 프로필 상세 정보 가져오기
    const results: InfluencerResult[] = [];
    const maxDetail = 5;

    for (let i = 0; i < similarResults.length; i++) {
      if (i < maxDetail) {
        const detail = await fetchProfileAbout(similarResults[i].profile.username);
        if (detail) {
          results.push({ profile: detail, recentPosts: [] });
        } else {
          results.push(similarResults[i]);
        }
        await new Promise((r) => setTimeout(r, 300));
      } else {
        results.push(similarResults[i]);
      }
    }

    // 3. AI로 추천 이유 생성 (Groq 무료)
    const usernames = results.map((r) => r.profile.username);
    const reasons = await generateRecommendReasons(username, usernames);

    // 추천 이유를 bio에 추가 (실제 bio가 없는 경우)
    for (const result of results) {
      const reason = reasons[result.profile.username];
      if (reason) {
        if (!result.profile.bio) {
          result.profile.bio = reason;
        } else {
          result.profile.bio = result.profile.bio + "\n\n💡 " + reason;
        }
      }
    }

    console.log("[find-similar] 최종 결과:", results.length, "개");

    // 4. 기록 저장
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
