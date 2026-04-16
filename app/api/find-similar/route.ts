import { NextRequest, NextResponse } from "next/server";
import {
  saveSearchHistory,
  getCachedProfile,
  setCachedProfile,
} from "@/lib/storage";
import { normalizeUsername, crawlInstagramProfile } from "@/lib/instagram";
import { findSimilarAccounts } from "@/lib/analyze";
import type { InfluencerResult } from "@/lib/types";

export const maxDuration = 300; // 5분 타임아웃

export async function POST(request: NextRequest) {
  try {
    const { username: rawUsername, bizCode } = await request.json();

    if (!rawUsername || !bizCode) {
      return NextResponse.json(
        { error: "계정명과 bizCode가 필요합니다." },
        { status: 400 }
      );
    }

    // Groq 키 확인
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      return NextResponse.json(
        { error: "Groq API 키가 설정되지 않았습니다. .env.local 파일에 GROQ_API_KEY를 입력해주세요." },
        { status: 500 }
      );
    }

    const username = normalizeUsername(rawUsername);

    // 1. 입력 계정 크롤링 (캐시 확인)
    let inputProfile;
    const cached = getCachedProfile(username);

    if (cached) {
      inputProfile = {
        profile: cached.profile_data,
        posts: cached.posts_data,
      };
    } else {
      const crawled = await crawlInstagramProfile(username);
      if (!crawled) {
        return NextResponse.json(
          { error: "계정을 찾을 수 없습니다. 계정명을 확인해주세요." },
          { status: 404 }
        );
      }
      inputProfile = { profile: crawled.profile, posts: crawled.posts };
      setCachedProfile(username, crawled.profile, crawled.posts);
    }

    // 2. AI로 유사 계정 분석 및 추천
    console.log("[find-similar] 크롤링 성공:", username);
    const analysis = await findSimilarAccounts(
      inputProfile.profile as Parameters<typeof findSimilarAccounts>[0]
    );
    console.log("[find-similar] AI 추천:", analysis.similar_usernames.length, "개");

    if (analysis.similar_usernames.length === 0) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        remainingSearches: -1,
      });
    }

    // 3. 추천된 계정들 크롤링 (캐시 우선, 최대 15개만)
    const maxCrawl = 15;
    const usernamesToCrawl = analysis.similar_usernames.slice(0, maxCrawl);
    const results: InfluencerResult[] = [];

    // 병렬 크롤링 (3개씩 동시 처리)
    for (let i = 0; i < usernamesToCrawl.length; i += 3) {
      const batch = usernamesToCrawl.slice(i, i + 3);
      const batchResults = await Promise.allSettled(
        batch.map(async (similarUsername) => {
          // @ 제거
          const clean = similarUsername.replace(/^@/, "");
          const cachedSimilar = getCachedProfile(clean);

          if (cachedSimilar) {
            return {
              profile: cachedSimilar.profile_data,
              recentPosts: cachedSimilar.posts_data,
            } as InfluencerResult;
          }

          const crawled = await crawlInstagramProfile(clean);
          if (!crawled) return null;

          setCachedProfile(clean, crawled.profile, crawled.posts);
          return {
            profile: crawled.profile,
            recentPosts: crawled.posts,
          } as InfluencerResult;
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          results.push(r.value);
        }
      }

      // 배치 간 딜레이
      if (i + 3 < usernamesToCrawl.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log("[find-similar] 크롤링 성공 계정:", results.length, "개");

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
