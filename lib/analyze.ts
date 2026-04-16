import Groq from "groq-sdk";
import type { InstagramProfile, InstagramPost, InfluencerResult } from "./types";

// Groq API (무료)를 이용하여 유사 계정 분석 및 상세 정보 추천
export async function findSimilarAccounts(
  inputUsername: string
): Promise<{ results: InfluencerResult[]; category: string; keywords: string[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const groq = new Groq({ apiKey });

  const prompt = `당신은 인스타그램 인플루언서 분석 전문가입니다.

인스타그램 계정 @${inputUsername} 과 감도(분위기, 스타일)가 비슷한 한국 인스타그램 계정을 20개 추천해주세요.

## 요청사항
1. @${inputUsername} 계정의 카테고리와 감도를 분석하세요
2. 비슷한 감도의 실존 한국 인스타그램 계정을 추천하세요
3. 각 계정의 상세 정보를 포함하세요
4. 팔로워 수가 1천~50만 범위의 인플루언서를 추천하세요
5. 반드시 실제로 존재하는 계정만 추천하세요

반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 텍스트 없이):
{
  "category": "카테고리",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "accounts": [
    {
      "username": "실제계정명",
      "name": "표시이름",
      "bio": "계정 소개 (추정)",
      "followers": 12000,
      "following": 500,
      "posts": 200,
      "is_verified": false,
      "external_url": null
    }
  ]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 응답이 비어있습니다");

    const parsed = JSON.parse(content);
    console.log("[analyze] AI 추천 계정 수:", parsed.accounts?.length || 0);

    const results: InfluencerResult[] = (parsed.accounts || []).map(
      (acc: {
        username: string;
        name: string;
        bio: string;
        followers: number;
        following: number;
        posts: number;
        is_verified: boolean;
        external_url: string | null;
      }) => {
        const profile: InstagramProfile = {
          username: acc.username.replace(/^@/, ""),
          name: acc.name || acc.username,
          profilePic: "",
          bio: acc.bio || "",
          externalUrl: acc.external_url || null,
          postsCount: acc.posts || 0,
          followersCount: acc.followers || 0,
          followingCount: acc.following || 0,
          isVerified: acc.is_verified || false,
        };

        const recentPosts: InstagramPost[] = [];

        return { profile, recentPosts };
      }
    );

    return {
      results,
      category: parsed.category || "",
      keywords: parsed.keywords || [],
    };
  } catch (error) {
    console.error("AI 분석 실패:", error);
    return { results: [], category: "분석 실패", keywords: [] };
  }
}
